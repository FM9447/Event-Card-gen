import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import PhotoUpload from './components/PhotoUpload';
import PosterCanvas from './components/PosterCanvas';
import InfoCards from './components/InfoCards';
import PartnersBlock from './components/PartnersBlock';
import AdminPanel from './components/AdminPanel';
import SparkleIcon from './components/SparkleIcon';
import { useEventConfig } from './hooks/useEventConfig';
import { logPosterGenerated, markPosterDownloaded, verifyConfigCredentials, globalLogin, createEvent } from './services/api';

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(255, 255, 255, ${alpha})`;
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Client-side Router Helper ──
const navigate = (path) => {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen for history push/pop state events
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Parse dynamic slug from route: /events/:slug or /e/:slug
  let routeSlug = null;
  if (currentPath.startsWith('/events/')) {
    routeSlug = currentPath.replace('/events/', '').split('?')[0].trim().toLowerCase();
  } else if (currentPath.startsWith('/e/')) {
    routeSlug = currentPath.replace('/e/', '').split('?')[0].trim().toLowerCase();
  }

  // Fallback to gemma4-kozhikode as the main route slug
  const activeSlug = routeSlug || 'gemma4-kozhikode';

  const [session, setSession] = useState({
    email: localStorage.getItem('admin-logged-in-email-' + activeSlug) || localStorage.getItem('global-logged-in-email') || '',
    password: localStorage.getItem('admin-logged-in-password-' + activeSlug) || localStorage.getItem('global-logged-in-password') || '',
  });

  useEffect(() => {
    setSession({
      email: localStorage.getItem('admin-logged-in-email-' + activeSlug) || localStorage.getItem('global-logged-in-email') || '',
      password: localStorage.getItem('admin-logged-in-password-' + activeSlug) || localStorage.getItem('global-logged-in-password') || '',
    });
  }, [activeSlug]);

  const { config, updateConfig, updatePartner, addPartner, removePartner, syncing, apiOk } = useEventConfig(activeSlug, session.email, session.password);

  const [userImgEl, setUserImgEl] = useState(null);       // HTMLImageElement for canvas
  const [isProcessing, setIsProcessing] = useState(false); // BG removal in progress
  const [bgRemoveEnabled, setBgRemoveEnabled] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const generationIdRef = useRef(null); // tracks current poster session for download marking
  
  // Photo toggle state variables to allow dynamic reprocessing
  const [rawFile, setRawFile] = useState(null);
  const [originalDataUrl, setOriginalDataUrl] = useState(null);

  // Check if admin session or URL param is active to open drawer
  useEffect(() => {
    if (routeSlug) {
      const urlParams = new URLSearchParams(window.location.search);
      const hasAdminParam = urlParams.has('admin');
      const isSessionLogged =
        localStorage.getItem('admin-logged-in-slug-' + routeSlug) === 'true' ||
        localStorage.getItem('global-logged-in') === 'true';
      if (hasAdminParam || isSessionLogged) {
        setAdminOpen(true);
        if (hasAdminParam) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, [routeSlug]);

  const loadImageElement = (src) => {
    const img = new Image();
    img.onload = () => setUserImgEl(img);
    img.src = src;
  };

  const processPhoto = useCallback(async (file, dataUrl, removeBg) => {
    if (removeBg && file) {
      setIsProcessing(true);
      try {
        const { removeBackground } = await import('@imgly/background-removal');
        const blob = await removeBackground(file);
        const objectUrl = URL.createObjectURL(blob);
        loadImageElement(objectUrl);
      } catch (err) {
        console.error('BG removal failed:', err);
        loadImageElement(dataUrl);
      } finally {
        setIsProcessing(false);
      }
    } else {
      loadImageElement(dataUrl);
    }
  }, []);

  // When user uploads a photo
  const handleImageReady = useCallback(async (file, dataUrl) => {
    setRawFile(file);
    setOriginalDataUrl(dataUrl);

    // Log analytics (non-blocking, no photo data sent)
    logPosterGenerated(activeSlug, { bgRemoved: bgRemoveEnabled })
      .then(id => { generationIdRef.current = id; });

    await processPhoto(file, dataUrl, bgRemoveEnabled);
  }, [bgRemoveEnabled, activeSlug, processPhoto]);

  // Re-process when BG remove toggle changes and we already have an image
  const handleBgRemoveToggle = useCallback(async (enabled) => {
    setBgRemoveEnabled(enabled);
    if (rawFile && originalDataUrl) {
      await processPhoto(rawFile, originalDataUrl, enabled);
    }
  }, [rawFile, originalDataUrl, processPhoto]);

  const handleAdminLoginSuccess = (email, password) => {
    localStorage.setItem(`admin-logged-in-slug-${activeSlug}`, 'true');
    localStorage.setItem(`admin-logged-in-email-${activeSlug}`, email);
    localStorage.setItem(`admin-logged-in-password-${activeSlug}`, password);
    setSession({ email, password });
  };

  const handleAdminLogOut = () => {
    localStorage.removeItem(`admin-logged-in-slug-${activeSlug}`);
    localStorage.removeItem(`admin-logged-in-email-${activeSlug}`);
    localStorage.removeItem(`admin-logged-in-password-${activeSlug}`);
    setSession({ email: '', password: '' });
  };

  const handleDownload = () => {
    markPosterDownloaded(generationIdRef.current);
    setSuccessMsg('🎉 Poster downloaded! Share it on social media with #ExploreGemma4');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // If path is root (/), render the Homepage
  if (!routeSlug) {
    return <HomePage />;
  }

  // Render Event Poster Creator Page
  const opacityVal = (config.backgroundOpacity !== undefined ? config.backgroundOpacity : 93) / 100;

  const bgStyle = config.backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(248, 249, 250, ${opacityVal}), rgba(248, 249, 250, ${opacityVal})), url(${config.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {};

  const themeStyle = {
    '--color-gemma-blue': config.themePrimary || '#4285F4',
    '--color-gemma-green': config.themeSecondary || '#34A853',
    '--color-charcoal': config.themeDark || '#1A1A1A',
    '--color-card-bg': hexToRgba(config.themeCardBg || '#FFFFFF', (config.themeCardOpacity ?? 75) / 100),
    '--color-card-border': hexToRgba(config.themeCardBg || '#FFFFFF', 0.25),
    '--color-header-bg': hexToRgba(config.themeHeaderBg || '#F8F9FA', (config.themeHeaderBgOpacity ?? 85) / 100),
    '--color-header-text': config.themeHeaderText || '#1A1A1A',
  };

  const rootStyle = {
    ...themeStyle,
    ...bgStyle,
  };

  return (
    <div className="min-h-screen relative text-charcoal" style={rootStyle}>
      {/* Default background floating sketch watermark */}
      {!config.backgroundImageUrl && (
        <div className="fixed bottom-0 right-0 w-full max-w-[650px] h-[550px] opacity-[0.05] pointer-events-none z-0 select-none">
          <img
            src="/sahya-sketch.png"
            alt="Sahya Building watermark"
            className="w-full h-full object-contain object-bottom-right"
          />
        </div>
      )}
      {/* Sync status toast */}
      {syncing && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5
                        rounded-xl bg-charcoal/90 backdrop-blur text-white text-xs font-medium
                        shadow-xl animate-[fadeIn_0.3s_ease-out]">
          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Saving to cloud…
        </div>
      )}
      {/* Offline warning */}
      {!apiOk && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5
                        rounded-xl bg-gemma-yellow/90 backdrop-blur text-charcoal text-xs font-semibold
                        shadow-xl animate-[fadeIn_0.3s_ease-out]">
          ⚠️ Working offline — changes saved locally
        </div>
      )}
      
      <Header config={config} onOrganizerClick={() => setAdminOpen(true)} />

      {/* ── Event Hero ── */}
      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 lg:py-16 relative z-10">

        {/* Page title */}
        <div className="text-center mb-12 animate-[fadeIn_0.5s_ease-out]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                          bg-gemma-blue/8 border border-gemma-blue/20 mb-5">
            <SparkleIcon size={12} color="var(--color-gemma-blue)" animate />
            <span className="text-xs font-semibold text-gemma-blue tracking-wide">/events/{config.slug}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-gemma-green animate-pulse" />
          </div>

          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-charcoal leading-tight mb-4">
            Generate Your{' '}
            <span className="text-gradient">Participation</span>
            <br />
            <span className="text-gradient">Poster</span>
          </h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Upload your photo, let AI remove the background, and download a stunning custom poster for{' '}
            <strong className="text-charcoal">{config.eventName || 'Poster Gen'}</strong>
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 items-start">

          {/* ════ LEFT COLUMN — Interactive Showcase ════ */}
          <div className="space-y-6 animate-[fadeIn_0.6s_ease-out]">
            {/* Section label */}
            <div className="flex items-center gap-2">
              <SparkleIcon size={16} color="var(--color-gemma-blue)" animate />
              <h2 className="font-display font-bold text-lg text-charcoal">Your Custom Poster</h2>
            </div>

            {/* Live canvas preview */}
            <PosterCanvas
              userImg={userImgEl}
              config={config}
              generationId={generationIdRef.current}
              onDownload={handleDownload}
            />

            {/* ── Generate section ── */}
            <div className="glass-card rounded-2xl p-6 space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gemma-blue to-gemma-green
                                flex items-center justify-center">
                  <SparkleIcon size={14} color="white" />
                </div>
                <h3 className="font-display font-bold text-charcoal text-base">Generate Your Custom Poster</h3>
              </div>

              <PhotoUpload
                onImageReady={handleImageReady}
                bgRemoveEnabled={bgRemoveEnabled}
                onBgRemoveToggle={handleBgRemoveToggle}
                isProcessing={isProcessing}
              />
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gemma-green/8 border border-gemma-green/20 animate-[fadeIn_0.3s_ease-out]">
                <SparkleIcon size={18} color="var(--color-gemma-green)" animate />
                <p className="text-sm font-semibold text-gemma-green">{successMsg}</p>
              </div>
            )}
          </div>

          {/* ════ RIGHT COLUMN — Info & Branding Hub ════ */}
          <div className="space-y-6 animate-[fadeIn_0.7s_ease-out]">
            {/* Section label */}
            <div className="flex items-center gap-2">
              <SparkleIcon size={16} color="var(--color-gemma-green)" animate />
              <h2 className="font-display font-bold text-lg text-charcoal">Event Information</h2>
            </div>

            {/* Building illustration card */}
            <BuildingCard bannerUrl={config.bannerUrl} />

            {/* Info cards */}
            <InfoCards config={config} />

            {/* Partners block */}
            <PartnersBlock
              partners={config.partners}
              themePrimary={config.themePrimary}
              themeSecondary={config.themeSecondary}
            />
          </div>
        </div>

        {/* ── How it works ── */}
        <HowItWorks config={config} />
      </main>

      {/* Footer */}
      <footer
        className="mt-20 border-t py-8 text-center transition-all duration-200"
        style={{
          background: 'var(--color-header-bg)',
          color: 'var(--color-header-text)',
          borderColor: 'rgba(226, 232, 240, 0.4)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <SparkleIcon size={14} color="var(--color-gemma-blue)" animate />
          <span className="text-sm font-semibold">{config.eventName || 'Poster Gen'}</span>
          <SparkleIcon size={14} color="var(--color-gemma-green)" animate />
        </div>
        <p className="text-xs opacity-75">
          Kozhikode · June 21, 2026 · A community event by{' '}
          <span className="font-semibold text-gemma-blue">Build with AI</span> &{' '}
          <span className="font-semibold text-gemma-green">µLearn</span>
        </p>
      </footer>

      {/* Admin panel */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        config={config}
        syncing={syncing}
        apiOk={apiOk}
        onUpdateConfig={updateConfig}
        onUpdatePartner={updatePartner}
        onAddPartner={addPartner}
        onRemovePartner={removePartner}
        onLogoUpload={(id, logo) => updatePartner(id, { logo })}
        initialStep={
          (localStorage.getItem('admin-logged-in-slug-' + config.slug) === 'true' ||
           localStorage.getItem('global-logged-in') === 'true')
            ? 'panel'
            : 'login'
        }
        sessionEmail={session.email}
        sessionPassword={session.password}
        onLoginSuccess={handleAdminLoginSuccess}
        onLogOut={handleAdminLogOut}
      />
    </div>
  );
}

/* ── Building illustration card ── */
function BuildingCard({ bannerUrl }) {
  return (
    <div className="relative glass-card rounded-2xl overflow-hidden group">
      {/* Corner sparkles */}
      <div className="absolute top-3 left-3 z-10 animate-[sparklePulse_3s_ease-in-out_infinite]">
        <SparkleIcon size={14} color="var(--color-gemma-blue)" />
      </div>
      <div className="absolute top-3 right-3 z-10 animate-[sparklePulse_3s_ease-in-out_0.8s_infinite]">
        <SparkleIcon size={10} color="var(--color-gemma-green)" />
      </div>
      <div className="absolute bottom-3 left-3 z-10 animate-[sparklePulse_3s_ease-in-out_1.6s_infinite]">
        <SparkleIcon size={8} color="#EA4335" />
      </div>
      <div className="absolute bottom-3 right-3 z-10 animate-[sparklePulse_3s_ease-in-out_2.4s_infinite]">
        <SparkleIcon size={12} color="#FBBC04" />
      </div>

      {/* Banner / Blueprint-style building illustration */}
      <div className="relative bg-[#1A1A1A] overflow-hidden flex items-center justify-center aspect-[2/1] w-full">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-15"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Cdefs%3E%3Cpattern id='grid' width='30' height='30' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 30 0 L 0 0 0 30' fill='none' stroke='%234285F4' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='30' height='30' fill='url(%23grid)'/%3E%3C/svg%3E")`,
             }}
        />

        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Event Banner"
            className="w-full h-full object-cover relative z-10 transform group-hover:scale-[1.01] transition-transform duration-500"
          />
        ) : (
          <img
            src="/sahya-sketch.png"
            alt="Sahya Building Government Cyber Park Kozhikode"
            className="max-h-[85%] w-auto relative z-10 object-contain drop-shadow-[0_4px_12px_rgba(66,133,244,0.3)] rounded-lg transform group-hover:scale-[1.03] transition-transform duration-500"
          />
        )}

        {/* Glow effect */}
        {!bannerUrl && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-20
                          bg-gemma-blue/15 rounded-full blur-2xl pointer-events-none" />
        )}
      </div>

      {/* Caption */}
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gemma-green animate-pulse" />
        <span className="text-xs font-semibold text-slate-600">IOCOD, Sahya Building · Government Cyber Park</span>
      </div>
    </div>
  );
}

/* ── How it works section ── */
function HowItWorks({ config }) {
  const steps = [
    {
      n: '01',
      color: config.themePrimary || '#4285F4',
      icon: '📸',
      title: 'Upload Your Photo',
      desc: 'Drag & drop or browse your device for any portrait or selfie photo.',
    },
    {
      n: '02',
      color: config.themeSecondary || '#34A853',
      icon: '✨',
      title: 'AI Removes Background',
      desc: 'Toggle the AI switch to cleanly remove your photo background — all in-browser.',
    },
    {
      n: '03',
      color: '#FBBC04',
      icon: '🎨',
      title: 'Live Preview Updates',
      desc: 'Watch your poster update in real-time on the canvas with the event template.',
    },
    {
      n: '04',
      color: '#EA4335',
      icon: '⬇️',
      title: 'Download & Share',
      desc: 'Download your 1080×1350px poster and share on Instagram, LinkedIn & Twitter.',
    },
  ];

  return (
    <section className="mt-20">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <SparkleIcon size={16} color="var(--color-gemma-blue)" animate />
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-charcoal">How It Works</h2>
          <SparkleIcon size={16} color="var(--color-gemma-green)" animate />
        </div>
        <p className="text-sm text-slate-400">Four simple steps to your custom event poster</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <div
            key={step.n}
            className="glass-card rounded-2xl p-5 text-center hover:shadow-[0_8px_32px_rgba(66,133,244,0.12)]
                       transition-all duration-300 hover:-translate-y-1 animate-[fadeIn_0.5s_ease-out]"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="text-2xl mb-3">{step.icon}</div>
            <div className="text-xs font-bold mb-2 tracking-widest" style={{ color: step.color }}>
              STEP {step.n}
            </div>
            <h3 className="font-display font-bold text-sm text-charcoal mb-1.5">{step.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Dynamic Home Page & Organizer Login ── */
function HomePage() {
  const [email, setEmail] = useState(localStorage.getItem('global-logged-in-email') || '');
  const [password, setPassword] = useState(localStorage.getItem('global-logged-in-password') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('global-logged-in') === 'true');
  const [events, setEvents] = useState([]);
  const [isMaster, setIsMaster] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form for creating new event
  const [newSlug, setNewSlug] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Auto-login on load if credentials exist
  useEffect(() => {
    if (isLoggedIn && email && password) {
      performLogin(email, password, true);
    }
  }, []);

  const performLogin = async (inputEmail, inputPassword, isAuto = false) => {
    setLoading(true);
    setLoginError('');
    try {
      const data = await globalLogin(inputEmail, inputPassword);
      if (data.ok) {
        setIsLoggedIn(true);
        setIsMaster(!!data.isMaster);
        setEvents(data.events || []);
        localStorage.setItem('global-logged-in', 'true');
        localStorage.setItem('global-logged-in-email', inputEmail);
        localStorage.setItem('global-logged-in-password', inputPassword);
      } else {
        if (!isAuto) setLoginError('Invalid email/username or password.');
      }
    } catch (err) {
      if (!isAuto) setLoginError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleLogout = () => {
    localStorage.removeItem('global-logged-in');
    localStorage.removeItem('global-logged-in-email');
    localStorage.removeItem('global-logged-in-password');
    setIsLoggedIn(false);
    setIsMaster(false);
    setEvents([]);
    setEmail('');
    setPassword('');
  };

  const handleGoToEvent = (eventSlug) => {
    // Sync credentials to the event-specific local storage so they are automatically authorized there
    localStorage.setItem(`admin-logged-in-slug-${eventSlug}`, 'true');
    localStorage.setItem(`admin-logged-in-email-${eventSlug}`, email);
    localStorage.setItem(`admin-logged-in-password-${eventSlug}`, password);
    navigate(`/events/${eventSlug}?admin=true`);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newSlug) {
      setCreateError('Please enter an event slug.');
      return;
    }
    const cleanSlug = newSlug.trim().toLowerCase();
    setCreateLoading(true);
    setCreateError('');

    try {
      await createEvent(cleanSlug, newEventName.trim(), email, password);
      // Success! Auto-login to the newly created event and redirect
      localStorage.setItem(`admin-logged-in-slug-${cleanSlug}`, 'true');
      localStorage.setItem(`admin-logged-in-email-${cleanSlug}`, email);
      localStorage.setItem(`admin-logged-in-password-${cleanSlug}`, password);
      navigate(`/events/${cleanSlug}?admin=true`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create event');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative text-charcoal flex flex-col bg-slate-50 animate-[fadeIn_0.5s_ease-out]"
         style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23E2E8F0' stroke-width='0.8'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='40' height='40' fill='url(%23grid)'/%3E%3C/svg%3E")`,
           backgroundAttachment: 'fixed',
         }}
    >
      {/* Sticky header */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-100 py-4 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Poster Gen Logo"
              className="w-9 h-9 rounded-xl object-cover shadow-sm"
            />
            <div>
              <span className="font-display font-black text-charcoal text-lg tracking-tight">Poster Gen</span>
              <span className="ml-1.5 text-[10px] bg-gemma-blue/8 text-gemma-blue border border-gemma-blue/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Poster Hub</span>
            </div>
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Logged in: <strong className="text-charcoal">{email}</strong>
                {isMaster && <span className="ml-1.5 px-2 py-0.5 rounded bg-red-100 text-red-600 font-bold text-[9px] uppercase tracking-wider">Master</span>}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all shadow-sm border border-red-100"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <a href="#login-box" className="text-xs font-bold text-slate-500 hover:text-gemma-blue border border-slate-200 hover:border-gemma-blue bg-white px-4 py-2 rounded-xl transition-all shadow-sm">
              🔒 Organizer Access
            </a>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto px-5 py-12 sm:py-16 text-center space-y-10 w-full">
        
        {/* Hero Section */}
        <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gemma-blue/8 border border-gemma-blue/20 mb-2">
            <SparkleIcon size={10} color="#4285F4" animate />
            <span className="text-[10px] font-bold text-gemma-blue uppercase tracking-widest">Self-Service Custom Poster Creator</span>
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-charcoal leading-tight">
            Welcome to <br/>
            <span className="text-gradient">Poster Gen Hub</span>
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Generate stunning custom participation posters for your local tech and developer community events instantly. Fully powered in-browser.
          </p>
        </div>

        {/* Dynamic Area based on Login state */}
        {isLoggedIn ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-left max-w-3xl mx-auto">
            
            {/* Events List card */}
            <div className="bg-white/90 backdrop-blur rounded-3xl p-6 border border-slate-100 shadow-xl space-y-4 min-h-[300px] flex flex-col">
              <div>
                <h3 className="font-display font-bold text-charcoal text-base flex items-center gap-2">
                  <span>📅</span> Your Managed Events
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select an event config below to customize templates, colors, logos, and check generation analytics.
                </p>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-2">
                  <div className="w-6 h-6 border-2 border-gemma-blue border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Loading events list…</p>
                </div>
              ) : events.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <span className="text-2xl mb-2">💡</span>
                  <h4 className="text-sm font-bold text-slate-700">No Events Found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    You haven't claimed or been invited to any event slugs yet. Create one!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {events.map((evt) => (
                    <div
                      key={evt.slug}
                      className="p-3.5 rounded-2xl border border-slate-100 hover:border-gemma-blue bg-white flex items-center justify-between group shadow-sm transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-charcoal truncate pr-2">
                          {evt.eventName || 'Unnamed Event'}
                        </h4>
                        <span className="text-[10px] font-semibold text-gemma-blue">
                          /events/{evt.slug}
                        </span>
                      </div>
                      <button
                        onClick={() => handleGoToEvent(evt.slug)}
                        className="flex-shrink-0 text-xs font-bold text-white bg-gemma-blue group-hover:bg-gemma-blue/90 px-3.5 py-1.5 rounded-xl shadow-sm transition-all"
                      >
                        Edit ⚙️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Event Card */}
            <div className="bg-white/90 backdrop-blur rounded-3xl p-6 border border-slate-100 shadow-xl space-y-4">
              <div>
                <h3 className="font-display font-bold text-charcoal text-base flex items-center gap-2">
                  <span>🆕</span> Claim / Create New Event
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter a unique URL slug (lowercase letters, numbers, and dashes only) to claim ownership and manage a new event.
                </p>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">Event Slug *</label>
                  <input
                    type="text"
                    placeholder="e.g. gemma4-kerala"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">Event Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Gemma 4 Launch Kerala"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                  />
                </div>

                {createError && <p className="text-xs text-red-500 font-semibold">{createError}</p>}

                <button
                  type="submit"
                  disabled={createLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-gemma-blue to-gemma-green text-white font-bold rounded-xl text-xs transition-all hover:brightness-105 active:scale-98 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Claiming slug…' : 'Create Event & Open'}
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div className="space-y-6">
            {/* Public Default Showcase Card */}
            <div className="max-w-md mx-auto bg-white/70 backdrop-blur rounded-3xl p-6 border border-white shadow-xl space-y-4 animate-[fadeIn_0.6s_ease-out]">
              <h3 className="font-display font-bold text-charcoal text-base">Explore Public Events</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/events/gemma4-kozhikode')}
                  className="w-full p-4 rounded-2xl border border-slate-100 hover:border-gemma-green text-left flex items-center justify-between group bg-white shadow-sm transition-all cursor-pointer animate-[fadeIn_0.5s_ease-out]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gemma-green/10 flex items-center justify-center text-lg">💡</div>
                    <div>
                      <h4 className="text-sm font-bold text-charcoal">Gemma 4 Launch Hub</h4>
                      <p className="text-xs text-slate-400">Default Template · Kozhikode</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gemma-green group-hover:translate-x-1 transition-transform">Enter →</span>
                </button>
              </div>
            </div>

            {/* Organizer Login Form */}
            <div id="login-box" className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-left space-y-5 animate-[fadeIn_0.7s_ease-out]">
              <div>
                <h3 className="font-display font-bold text-charcoal text-lg flex items-center gap-2">
                  <span>🔒</span> Organizer Access
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Sign in with your organizer email and password to view and manage your developer community events, configurations, and templates.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4 font-sans">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Email / Username</label>
                  <input
                    type="text"
                    placeholder="Enter organizer email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Password</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                    required
                  />
                </div>

                {loginError && <p className="text-xs text-red-500 font-semibold">{loginError}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-gemma-blue to-gemma-green text-white font-bold rounded-xl text-sm transition-all hover:brightness-105 active:scale-98 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying credentials…' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400 mt-12 bg-white/40">
        Poster Gen Hub · Built with AI & µLearn Dev Community
      </footer>
    </div>
  );
}

