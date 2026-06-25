import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import PhotoUpload from './components/PhotoUpload';
import PosterCanvas from './components/PosterCanvas';
import InfoCards from './components/InfoCards';
import PartnersBlock from './components/PartnersBlock';
import AdminPanel from './components/AdminPanel';
import SparkleIcon from './components/SparkleIcon';
import CropperModal from './components/CropperModal';
import { useEventConfig } from './hooks/useEventConfig';
import { logPosterGenerated, markPosterDownloaded, globalLogin, createEvent, removeBgServer } from './services/api';

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
  const [selectedTemplateKeyword, setSelectedTemplateKeyword] = useState('');

  // Automatically select first template if no default template URL is set
  useEffect(() => {
    if (config.templates && config.templates.length > 0 && !config.templateUrl && !selectedTemplateKeyword) {
      setSelectedTemplateKeyword(config.templates[0].keyword);
    }
  }, [config.templates, config.templateUrl, selectedTemplateKeyword]);
  const [bgRemoveEnabled, setBgRemoveEnabled] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const generationIdRef = useRef(null); // tracks current poster session for download marking
  
  // Photo toggle state variables to allow dynamic reprocessing
  const [rawFile, setRawFile] = useState(null);
  const [originalDataUrl, setOriginalDataUrl] = useState(null);
  const [cropModalData, setCropModalData] = useState(null); // { file, dataUrl }

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
        const processedUrl = await removeBgServer(file);
        loadImageElement(processedUrl);
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
  const handleImageReady = useCallback((file, dataUrl) => {
    // Before processing, open the cropper
    setCropModalData({ file, dataUrl });
  }, []);

  const handleCropComplete = useCallback(async (croppedBlob, croppedUrl) => {
    setCropModalData(null);
    const newFile = new File([croppedBlob], cropModalData.file?.name || 'photo.png', { type: 'image/png' });
    setRawFile(newFile);
    setOriginalDataUrl(croppedUrl);

    // Log analytics (non-blocking, no photo data sent)
    logPosterGenerated(activeSlug, { bgRemoved: bgRemoveEnabled })
      .then(id => { generationIdRef.current = id; });

    await processPhoto(newFile, croppedUrl, bgRemoveEnabled);
  }, [cropModalData, bgRemoveEnabled, activeSlug, processPhoto]);

  const handleCropCancel = useCallback(() => {
    setCropModalData(null);
  }, []);

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
    localStorage.removeItem('global-logged-in');
    localStorage.removeItem('global-logged-in-email');
    localStorage.removeItem('global-logged-in-password');
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

  // Resolve active template from keyword
  const activeTemplate = config.templates?.find(
    (t) => t.keyword.toLowerCase() === selectedTemplateKeyword.toLowerCase()
  );
  const resolvedConfig = {
    ...config,
    templateUrl: activeTemplate ? activeTemplate.templateUrl : config.templateUrl,
    templatePublicId: activeTemplate ? activeTemplate.templatePublicId : config.templatePublicId,
  };

  // Render Event Poster Creator Page
  const opacityVal = (config.backgroundOpacity !== undefined ? config.backgroundOpacity : 93) / 100;

  const bgStyle = config.backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(248, 249, 250, ${opacityVal}), rgba(248, 249, 250, ${opacityVal})), url(${config.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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
      
      <Header 
        config={config} 
        onOrganizerClick={() => setAdminOpen(true)} 
        isLoggedIn={!!session.email && !!session.password} 
      />

      {/* ── Event Hero ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative z-10">

        {/* Page title */}
        <div className="text-center mb-8 lg:mb-12 animate-[fadeIn_0.5s_ease-out]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                          bg-gemma-blue/8 border border-gemma-blue/20 mb-4">
            <SparkleIcon size={10} color="var(--color-gemma-blue)" animate />
            <span className="text-[10px] font-bold text-gemma-blue tracking-widest uppercase">/events/{config.slug}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-gemma-green animate-pulse" />
          </div>

          <h1 className="font-display font-black text-3xl lg:text-5xl text-charcoal leading-tight mb-3">
            Get Your{' '}
            <span className="text-gradient">Event Poster</span>
          </h1>
          <p className="text-slate-500 text-sm lg:text-base max-w-xl mx-auto leading-relaxed">
            <strong className="text-charcoal">{config.eventName || 'Poster Gen'}</strong> &middot; Upload your photo
            {' '}and get a custom poster in seconds.
          </p>
        </div>

        {/* ── Mobile: single column | Desktop: two columns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start animate-[fadeIn_0.5s_ease-out]">

          {/* ════ LEFT COLUMN — Canvas + Upload ════ */}
          <div className="space-y-6">
            {/* Live canvas preview */}
            <PosterCanvas
              userImg={userImgEl}
              config={resolvedConfig}
              isProcessing={isProcessing}
              generationId={generationIdRef.current}
              onDownload={handleDownload}
            />

            {/* Template Selector Dropdown */}
            {config.templates && config.templates.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gemma-blue to-gemma-green
                                  flex items-center justify-center flex-shrink-0">
                    <SparkleIcon size={12} color="white" />
                  </div>
                  <h2 className="font-display font-bold text-charcoal text-sm">Select Your Role / Template</h2>
                </div>
                <div className="relative">
                  <select
                    value={selectedTemplateKeyword}
                    onChange={(e) => setSelectedTemplateKeyword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold bg-white text-charcoal
                               focus:outline-none focus:border-gemma-blue focus:ring-1 focus:ring-gemma-blue/20 transition-all cursor-pointer appearance-none"
                  >
                    {config.templateUrl && (
                      <option value="">{config.templateKeyword || 'Default'}</option>
                    )}
                    {config.templates.map((t, idx) => (
                      <option key={idx} value={t.keyword}>{t.keyword}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Upload section */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gemma-blue to-gemma-green
                                flex items-center justify-center flex-shrink-0">
                  <SparkleIcon size={12} color="white" />
                </div>
                <h2 className="font-display font-bold text-charcoal text-sm">Upload Your Photo</h2>
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

          {/* ════ RIGHT COLUMN — Info, Banner, Partners ════ */}
          <div className="space-y-6">
            {/* Event banner */}
            <BuildingCard bannerUrl={config.bannerUrl} />
            {/* Info cards */}
            <InfoCards config={config} />
            {/* Partners block */}
            {config.partners && config.partners.length > 0 && (
              <PartnersBlock
                partners={config.partners}
                themePrimary={config.themePrimary}
                themeSecondary={config.themeSecondary}
              />
            )}
          </div>
        </div>

        {/* ── How it works ── */}
        <HowItWorks config={config} />
      </main>

      {/* Footer */}
      <footer
        className="mt-12 border-t py-6 transition-all duration-200"
        style={{
          background: 'var(--color-header-bg)',
          color: 'var(--color-header-text)',
          borderColor: 'rgba(226, 232, 240, 0.4)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-5 h-5 rounded-md object-cover" />
            <span className="text-xs font-bold">Poster Gen</span>
          </div>
          <span className="text-[10px] opacity-70 hidden sm:inline">·</span>
          <span className="text-[10px] opacity-70">Open Source</span>
        </div>
      </footer>

      {/* Admin Panel Drawer */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        activeSlug={activeSlug}
        config={config}
        syncing={syncing}
        apiOk={apiOk}
        onUpdateConfig={updateConfig}
        onUpdatePartner={updatePartner}
        onAddPartner={addPartner}
        onRemovePartner={removePartner}
        onLogoUpload={(id, logo) => updatePartner(id, { logo })}
        initialStep={
          (localStorage.getItem('admin-logged-in-slug-' + activeSlug) === 'true' ||
           localStorage.getItem('global-logged-in') === 'true')
            ? 'panel'
            : 'login'
        }
        sessionEmail={session.email}
        sessionPassword={session.password}
        onLoginSuccess={handleAdminLoginSuccess}
        onLogOut={handleAdminLogOut}
      />

      {/* Cropper Modal */}
      {cropModalData && (
        <CropperModal
          imageSrc={cropModalData.dataUrl}
          photoShape={config.photoShape || 'circle'}
          aspectRatio={(config.photoWidth || 400) / (config.photoHeight || 400)}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
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
      title: 'Tap to Upload',
      desc: 'Tap the upload zone and pick any photo from your camera roll.',
    },
    {
      n: '02',
      color: config.themeSecondary || '#34A853',
      icon: '✨',
      title: 'AI Magic',
      desc: 'Toggle AI to remove your background — runs fully in-browser.',
    },
    {
      n: '03',
      color: '#FBBC04',
      icon: '🎨',
      title: 'Live Preview',
      desc: 'Your poster updates in real-time with the event template.',
    },
    {
      n: '04',
      color: '#EA4335',
      icon: '⬇️',
      title: 'Save & Share',
      desc: 'Download and share on Instagram, LinkedIn & Twitter.',
    },
  ];

  return (
    <section className="mt-10">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <SparkleIcon size={14} color="var(--color-gemma-blue)" animate />
          <h2 className="font-display font-bold text-xl text-charcoal">How It Works</h2>
          <SparkleIcon size={14} color="var(--color-gemma-green)" animate />
        </div>
        <p className="text-xs text-slate-400">Four quick steps</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {steps.map((step, i) => (
          <div
            key={step.n}
            className="glass-card rounded-2xl p-4 text-center hover:shadow-[0_8px_32px_rgba(66,133,244,0.12)]
                       transition-all duration-300 animate-[fadeIn_0.5s_ease-out]"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="text-xl mb-2">{step.icon}</div>
            <div className="text-[9px] font-bold mb-1.5 tracking-widest" style={{ color: step.color }}>
              STEP {step.n}
            </div>
            <h3 className="font-display font-bold text-xs text-charcoal mb-1">{step.title}</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Dynamic Home Page & Organizer Login ── */
function HomePage() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState(localStorage.getItem('global-logged-in-email') || '');
  const [password, setPassword] = useState(localStorage.getItem('global-logged-in-password') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('global-logged-in') === 'true');
  const [events, setEvents] = useState([]);
  const [isMaster, setIsMaster] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEventSlug, setRegEventSlug] = useState('');
  const [regEventName, setRegEventName] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Create event (logged-in)
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
        if (!isAuto) setLoginError('Invalid credentials. Please try again.');
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regEventSlug) {
      setRegError('Email, password and event slug are required.');
      return;
    }
    const cleanSlug = regEventSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setRegLoading(true);
    setRegError('');
    try {
      await createEvent(cleanSlug, regEventName.trim(), regEmail.trim(), regPassword);
      // Auto-login after registration
      localStorage.setItem('global-logged-in', 'true');
      localStorage.setItem('global-logged-in-email', regEmail.trim());
      localStorage.setItem('global-logged-in-password', regPassword);
      localStorage.setItem(`admin-logged-in-slug-${cleanSlug}`, 'true');
      localStorage.setItem(`admin-logged-in-email-${cleanSlug}`, regEmail.trim());
      localStorage.setItem(`admin-logged-in-password-${cleanSlug}`, regPassword);
      navigate(`/events/${cleanSlug}?admin=true`);
    } catch (err) {
      setRegError(err.message || 'Registration failed. Slug may already be taken.');
    } finally {
      setRegLoading(false);
    }
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
    <div
      className="min-h-screen relative text-charcoal flex flex-col bg-slate-50 animate-[fadeIn_0.5s_ease-out]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23E2E8F0' stroke-width='0.8'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='40' height='40' fill='url(%23grid)'/%3E%3C/svg%3E")`,
      }}
    >
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Poster Gen Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
            <div>
              <span className="font-display font-black text-charcoal text-base tracking-tight">Poster Gen</span>
              {isMaster && isLoggedIn && (
                <span className="ml-2 text-[9px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Master</span>
              )}
            </div>
          </div>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all border border-red-100"
            >
              Sign Out
            </button>
          ) : (
            <a
              href="#access-card"
              className="text-xs font-bold text-gemma-blue border border-gemma-blue/30 bg-gemma-blue/5 px-3 py-1.5 rounded-xl transition-all"
            >
              🔒 Sign In
            </a>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 w-full">

        {/* Hero */}
        <div className="text-center space-y-4 mb-10 animate-[fadeIn_0.5s_ease-out]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gemma-blue/8 border border-gemma-blue/20">
            <SparkleIcon size={10} color="#4285F4" animate />
            <span className="text-[10px] font-bold text-gemma-blue uppercase tracking-widest">Custom Poster Creator</span>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-6xl text-charcoal leading-tight">
            <span className="text-gradient">Poster Gen</span>
          </h1>
          <p className="text-slate-500 text-sm lg:text-base max-w-lg mx-auto leading-relaxed">
            Create stunning participation posters for your community events. Fast, free, fully in-browser.
          </p>
        </div>

        {/* ── Conditional body layout ── */}
        {isLoggedIn ? (
          /* ── LOGGED IN: events list left | create event right ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start animate-[fadeIn_0.5s_ease-out]">

            {/* LEFT */}
            <div className="space-y-5">
              {/* Public Events */}
              <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border border-slate-100 shadow-lg space-y-3">
                <h3 className="font-display font-bold text-charcoal text-sm flex items-center gap-2">
                  <span>🌐</span> Public Events
                </h3>
                <button
                  onClick={() => navigate('/events/gemma4-kozhikode')}
                  className="w-full p-4 rounded-2xl border border-slate-100 hover:border-gemma-green text-left flex items-center justify-between group bg-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gemma-green/10 flex items-center justify-center text-lg flex-shrink-0">💡</div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-charcoal">Gemma 4 Launch Hub</h4>
                      <p className="text-xs text-slate-400">Kozhikode · Open to all</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gemma-green group-hover:translate-x-0.5 transition-transform flex-shrink-0">Open →</span>
                </button>
              </div>

              {/* User badge */}
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gemma-blue to-gemma-green flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal truncate">{email}</p>
                  <p className="text-[10px] text-slate-400">{isMaster ? '👑 Master Admin' : 'Organizer'}</p>
                </div>
              </div>

              {/* Events list */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-lg space-y-4">
                <h3 className="font-display font-bold text-charcoal text-sm flex items-center gap-2">
                  <span>📅</span> Your Events
                  {loading && <div className="w-3.5 h-3.5 border-2 border-gemma-blue border-t-transparent rounded-full animate-spin ml-1" />}
                </h3>
                {events.length === 0 && !loading ? (
                  <div className="flex flex-col items-center py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <span className="text-2xl mb-2">💡</span>
                    <p className="text-xs text-slate-500 font-semibold">No events yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Create one on the right →</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((evt) => (
                      <div
                        key={evt.slug}
                        className="p-3.5 rounded-2xl border border-slate-100 hover:border-gemma-blue bg-slate-50 flex items-center justify-between group transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-charcoal truncate">{evt.eventName || 'Unnamed Event'}</p>
                          <span className="text-[10px] font-semibold text-gemma-blue">/e/{evt.slug}</span>
                        </div>
                        <button
                          onClick={() => handleGoToEvent(evt.slug)}
                          className="flex-shrink-0 text-xs font-bold text-white bg-gemma-blue px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95"
                        >
                          Edit ⚙️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Create New Event — sticky on desktop */}
            <div>
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl space-y-4 lg:sticky lg:top-24">
                <div>
                  <h3 className="font-display font-bold text-charcoal text-base flex items-center gap-2 mb-1">
                    <span>🆕</span> Create New Event
                  </h3>
                  <p className="text-xs text-slate-400">Set up a new event workspace with a unique slug.</p>
                </div>
                <form onSubmit={handleCreateEvent} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Event slug (e.g. my-event-2026)"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Event display name (optional)"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                  />
                  {createError && <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-gemma-blue to-gemma-green text-white font-bold rounded-xl text-sm transition-all hover:brightness-105 active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {createLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Creating…
                      </span>
                    ) : 'Create & Open Event →'}
                  </button>
                </form>
              </div>
            </div>
          </div>

        ) : (
          /* ── NOT LOGGED IN: features left | auth card right ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-10 items-start animate-[fadeIn_0.55s_ease-out]">

            {/* LEFT: public events + feature highlights */}
            <div className="space-y-5">
              <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border border-slate-100 shadow-lg space-y-3">
                <h3 className="font-display font-bold text-charcoal text-sm flex items-center gap-2">
                  <span>🌐</span> Public Events
                </h3>
                <button
                  onClick={() => navigate('/events/gemma4-kozhikode')}
                  className="w-full p-4 rounded-2xl border border-slate-100 hover:border-gemma-green text-left flex items-center justify-between group bg-white shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gemma-green/10 flex items-center justify-center text-lg flex-shrink-0">💡</div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-charcoal">Gemma 4 Launch Hub</h4>
                      <p className="text-xs text-slate-400">Kozhikode · Open to all</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gemma-green group-hover:translate-x-0.5 transition-transform flex-shrink-0">Open →</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🎨', title: 'Custom Templates', desc: 'Brand-matched poster designs per event' },
                  { icon: '🤖', title: 'AI BG Removal', desc: 'Auto-remove photo backgrounds instantly' },
                  { icon: '⚡', title: 'Instant Download', desc: 'Generate & download in seconds' },
                  { icon: '📱', title: 'Share Ready', desc: 'Perfect for WhatsApp & Instagram' },
                ].map((f) => (
                  <div key={f.title} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="text-xl mb-2">{f.icon}</div>
                    <p className="text-xs font-bold text-charcoal">{f.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Sign In / Register card — sticky on desktop */}
            <div id="access-card" className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden lg:sticky lg:top-24">
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => { setActiveTab('login'); setLoginError(''); }}
                  className={`flex-1 py-4 text-sm font-bold transition-all ${
                    activeTab === 'login'
                      ? 'text-gemma-blue border-b-2 border-gemma-blue bg-gemma-blue/4'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setActiveTab('register'); setRegError(''); }}
                  className={`flex-1 py-4 text-sm font-bold transition-all ${
                    activeTab === 'register'
                      ? 'text-gemma-green border-b-2 border-gemma-green bg-gemma-green/4'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Register
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <p className="text-xs text-slate-400">Sign in to manage your events and templates.</p>
                    <div className="space-y-3">
                      <input
                        id="login-email"
                        type="text"
                        placeholder="Email or username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                        autoComplete="username"
                        required
                      />
                      <input
                        id="login-password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-gemma-blue focus:outline-none text-sm transition-colors"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    {loginError && (
                      <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg">{loginError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-gradient-to-r from-gemma-blue to-gemma-green text-white font-bold rounded-xl text-sm transition-all hover:brightness-105 active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Signing in…
                        </span>
                      ) : 'Sign In →'}
                    </button>
                    <p className="text-center text-[11px] text-slate-400">
                      New here?{' '}
                      <button type="button" onClick={() => setActiveTab('register')} className="text-gemma-green font-bold hover:underline">
                        Create an account
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <p className="text-xs text-slate-400">Create your account and claim your event slug.</p>
                    <div className="space-y-3">
                      <input
                        id="reg-email"
                        type="email"
                        placeholder="Your email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-gemma-green focus:outline-none text-sm transition-colors"
                        autoComplete="email"
                        required
                      />
                      <input
                        id="reg-password"
                        type="password"
                        placeholder="Create a password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-gemma-green focus:outline-none text-sm transition-colors"
                        autoComplete="new-password"
                        required
                      />
                      <div className="relative">
                        <input
                          id="reg-event-slug"
                          type="text"
                          placeholder="Event slug (e.g. my-event-2026)"
                          value={regEventSlug}
                          onChange={(e) => setRegEventSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-gemma-green focus:outline-none text-sm transition-colors"
                          required
                        />
                        {regEventSlug && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gemma-green font-bold">/e/{regEventSlug}</span>
                        )}
                      </div>
                      <input
                        id="reg-event-name"
                        type="text"
                        placeholder="Event display name (optional)"
                        value={regEventName}
                        onChange={(e) => setRegEventName(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-gemma-green focus:outline-none text-sm transition-colors"
                      />
                    </div>
                    {regError && (
                      <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-lg">{regError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-gemma-green to-gemma-blue text-white font-bold rounded-xl text-sm transition-all hover:brightness-105 active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {regLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Creating account…
                        </span>
                      ) : 'Register & Get Started →'}
                    </button>
                    <p className="text-center text-[11px] text-slate-400">
                      Already have an account?{' '}
                      <button type="button" onClick={() => setActiveTab('login')} className="text-gemma-blue font-bold hover:underline">
                        Sign in
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-5 bg-white/40">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-5 h-5 rounded-md object-cover" />
            <span className="text-xs font-bold text-charcoal">Poster Gen</span>
          </div>
          <p className="text-[10px] text-slate-400">Open Source</p>
        </div>
      </footer>
    </div>
  );
}

