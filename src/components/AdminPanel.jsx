import { useState, useEffect, useRef } from 'react';
import SparkleIcon from './SparkleIcon';
import AdminPreview from './AdminPreview';

import { removeBgServer } from '../services/api';

const ADMIN_PASSWORD = 'GEMMA2026';

// Helper to convert base64 to File
function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

async function removeImageBackground(fileOrDataUrl) {
  let file = fileOrDataUrl;
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    file = dataURLtoFile(fileOrDataUrl, 'logo.png');
  } else if (typeof fileOrDataUrl === 'string') {
    const res = await fetch(fileOrDataUrl);
    const blob = await res.blob();
    file = new File([blob], 'logo.png', { type: blob.type });
  }
  return await removeBgServer(file);
}

function PartnerRow({ partner, onUpdate, onRemove, onLogoUpload }) {
  const fileRef = useRef();
  const [bgRemoving, setBgRemoving] = useState(false);

  const handleRemoveBg = async () => {
    if (!partner.logo) return;
    setBgRemoving(true);
    try {
      const result = await removeImageBackground(partner.logo);
      onLogoUpload(partner.id, result);
    } catch (err) {
      console.error('Failed to remove partner logo bg:', err);
    } finally {
      setBgRemoving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 group">
      {/* Logo preview */}
      <button
        onClick={() => fileRef.current?.click()}
        className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-200
                   hover:border-[#4285F4] flex items-center justify-center flex-shrink-0
                   overflow-hidden transition-colors"
        title="Upload logo"
      >
        {partner.logo ? (
          <img src={partner.logo} alt={partner.name} className="w-full h-full object-contain p-1" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => onLogoUpload(partner.id, ev.target.result);
            reader.readAsDataURL(file);
          }}
        />
      </button>

      {/* Name input */}
      <input
        value={partner.name}
        onChange={(e) => onUpdate(partner.id, { name: e.target.value })}
        className="flex-1 text-sm font-medium bg-transparent border-none outline-none
                   focus:bg-white focus:ring-1 focus:ring-[#4285F4]/30 rounded-lg px-2 py-1
                   transition-all text-[#1A1A1A] placeholder:text-slate-300"
        placeholder="Partner name"
      />

      {partner.logo && (
        <button
          onClick={handleRemoveBg}
          disabled={bgRemoving}
          className="px-2 py-1 text-[10px] font-bold text-gemma-green bg-gemma-green/8 hover:bg-gemma-green/15 rounded-lg transition-colors whitespace-nowrap flex items-center gap-0.5"
          title="Remove logo background with AI"
        >
          {bgRemoving ? 'Removing…' : '✨ Remove BG'}
        </button>
      )}

      {/* Remove */}
      <button
        onClick={() => onRemove(partner.id)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300
                   hover:text-[#EA4335] hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove partner"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

export default function AdminPanel({
  isOpen,
  onClose,
  config,
  syncing,
  apiOk,
  onUpdateConfig,
  onUpdatePartner,
  onAddPartner,
  onRemovePartner,
  onLogoUpload,
  initialStep = 'login',
  sessionEmail,
  sessionPassword,
  onLoginSuccess,
  onLogOut
}) {
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
    }
  }, [isOpen, initialStep]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const headerLogoRef = useRef();
  const templateFileRef = useRef();
  const bgFileRef = useRef();
  const bannerFileRef = useRef();
  const [stats, setStats] = useState(null);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [templateProgress, setTemplateProgress] = useState(0);
  const [templateError, setTemplateError] = useState('');

  // Keyword-specific templates state
  const [keywordInput, setKeywordInput] = useState('');
  const [multiTemplateUploading, setMultiTemplateUploading] = useState(false);
  const [multiTemplateProgress, setMultiTemplateProgress] = useState(0);
  const [multiTemplateError, setMultiTemplateError] = useState('');
  const multiTemplateFileRef = useRef();
  const [bgUploading, setBgUploading] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgError, setBgError] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [bannerError, setBannerError] = useState('');
  const [headerBgRemoving, setHeaderBgRemoving] = useState(false);

  const isMaster = sessionEmail?.toLowerCase() === 'fm9447';

  // Fetch stats when panel opens
  useEffect(() => {
    if (step === 'panel') {
      import('../services/api').then(({ fetchStats }) =>
        fetchStats(config.slug || 'gemma4-kozhikode')
          .then(s => setStats(s))
          .catch(() => {})
      );
    }
  }, [step, config.slug]);

  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError('Please enter email/username and password.');
      return;
    }
    setLoading(true);
    setLoginError('');

    try {
      const slug = config.slug || 'gemma4-kozhikode';
      const { verifyConfigCredentials } = await import('../services/api');
      const data = await verifyConfigCredentials(slug, username, password);

      if (data.ok) {
        onLoginSuccess(username, password);
        setStep('panel');
        setLoginError('');
      } else {
        setLoginError('Invalid credentials or unauthorized.');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials or unauthorized');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    const isLogged = localStorage.getItem('admin-logged-in-slug-' + (config.slug || 'gemma4-kozhikode')) === 'true';
    setStep(isLogged ? 'panel' : 'login');
    setPassword('');
    setLoginError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="admin-drawer flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#4285F4]/5 to-[#34A853]/5">
          <div className="flex items-center gap-2.5">
            <SparkleIcon size={18} color="#4285F4" animate />
            <div>
              <h2 className="font-display font-bold text-[#1A1A1A] text-base">Organizer Panel</h2>
              <p className="text-xs text-slate-400">{config.slug || 'gemma4-kozhikode'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === 'panel' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Log out from Organizer session?')) {
                    onLogOut();
                    setStep('login');
                    onClose();
                  }
                }}
                className="text-[10px] font-bold text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors border border-red-100"
              >
                Log Out
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400
                         hover:text-[#1A1A1A] hover:bg-slate-100 transition-colors"
              id="admin-close-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'login' ? (
            /* ── Login ── */
            <div className="p-6 space-y-5">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4285F4] to-[#34A853]
                                flex items-center justify-center mx-auto mb-4 shadow-[0_4px_16px_rgba(66,133,244,0.3)]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="white" strokeWidth="2"/>
                    <path d="M8 11V7a4 4 0 018 0v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="font-display font-bold text-xl text-[#1A1A1A]">Organizer Access</h3>
                <p className="text-xs text-slate-400 mt-1">Enter your email or username and password. If this event is unclaimed, sign in with your email and password to claim it.</p>
              </div>

              <div className="space-y-3">
                <input
                  id="admin-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter email or username"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium
                             focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4]
                             bg-white text-[#1A1A1A] placeholder:text-slate-300 transition-all"
                  disabled={loading}
                />

                <input
                  id="admin-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium
                             focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4]
                             bg-white text-[#1A1A1A] placeholder:text-slate-300 transition-all"
                  disabled={loading}
                />

                {loginError && (
                  <p className="text-xs text-[#EA4335] font-medium px-1">{loginError}</p>
                )}

                <button
                  id="admin-login-btn"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white
                             bg-gradient-to-r from-[#4285F4] to-[#34A853]
                             hover:from-[#3674e8] hover:to-[#2e9649]
                             active:scale-[0.98] transition-all duration-200
                             shadow-[0_4px_16px_rgba(66,133,244,0.35)] disabled:opacity-50"
                >
                  {loading ? 'Verifying…' : 'Access Admin Panel'}
                </button>
              </div>      </div>
          ) : (
            /* ── Admin Panel ── */
            <div className="p-6 space-y-7">
              {/* Section: Event Branding */}
              <section>
                <SectionLabel icon="🎨" label="Event Branding" />

                <div className="space-y-4 mt-3">
                  {/* Header logo upload */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-2">Header Logo</label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200
                                      flex items-center justify-center overflow-hidden bg-slate-50">
                        {config.headerLogo ? (
                          <img src={config.headerLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <SparkleIcon size={20} color="#CBD5E1" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => headerLogoRef.current?.click()}
                          className="text-xs font-semibold text-[#4285F4] border border-[#4285F4]/30
                                     rounded-lg px-3 py-1.5 hover:bg-[#4285F4]/5 transition-colors"
                          id="upload-header-logo-btn"
                        >
                          Upload Logo
                        </button>
                        {config.headerLogo && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => onUpdateConfig({ headerLogo: null })}
                              className="text-xs font-medium text-[#EA4335] hover:underline"
                            >
                              Remove
                            </button>
                            <button
                              onClick={async () => {
                                if (headerBgRemoving) return;
                                setHeaderBgRemoving(true);
                                try {
                                  const result = await removeImageBackground(config.headerLogo);
                                  onUpdateConfig({ headerLogo: result });
                                } catch (e) {
                                  console.error('Failed to remove header logo bg:', e);
                                } finally {
                                  setHeaderBgRemoving(false);
                                }
                              }}
                              disabled={headerBgRemoving}
                              className="text-xs font-semibold text-gemma-green hover:underline disabled:opacity-60 flex items-center gap-0.5"
                            >
                              {headerBgRemoving ? 'Removing…' : '✨ Remove BG'}
                            </button>
                          </div>
                        )}
                      </div>
                      <input
                        ref={headerLogoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => onUpdateConfig({ headerLogo: ev.target.result });
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>

                    {config.headerLogo && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                          <span>Logo Height</span>
                          <span className="text-slate-700 font-bold">{config.headerLogoHeight || 40}px</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={config.headerLogoHeight || 40}
                          onChange={(e) => onUpdateConfig({ headerLogoHeight: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <Divider />

              {/* Section: Poster Template */}
              <section>
                <SectionLabel icon="🖼️" label="Poster Template" />
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Upload a custom background template. It will be stored in your
                  <span className="font-semibold text-[#4285F4]"> Cloudinary / gemma 4 / templates</span> folder
                  and used as the poster base layer.
                </p>

                {/* Current template preview */}
                {config.templateUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#34A853]/30 mb-3 group">
                    <img
                      src={config.templateUrl}
                      alt="Current template"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <button
                        onClick={async () => {
                          if (!confirm('Remove this template? The poster will revert to the default design.')) return;
                          try {
                            const { removeTemplate } = await import('../services/api');
                            await removeTemplate(config.slug || 'gemma4-kozhikode', sessionEmail, sessionPassword);
                            onUpdateConfig({ templateUrl: null, templatePublicId: null });
                          } catch (e) {
                            setTemplateError('Failed to remove template');
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                                   bg-[#EA4335] text-white text-xs font-semibold
                                   px-4 py-2 rounded-xl shadow-lg"
                        id="remove-template-btn"
                      >
                        ✕ Remove Template
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-[#34A853]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ACTIVE
                    </div>
                  </div>
                ) : null}

                {/* Upload zone */}
                <div
                  onClick={() => templateFileRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer
                    transition-all duration-200 group
                    ${
                      templateUploading
                        ? 'border-[#4285F4] bg-blue-50'
                        : 'border-slate-200 hover:border-[#4285F4] hover:bg-blue-50/40'
                    }
                  `}
                  id="template-upload-zone"
                >
                  {templateUploading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-[#4285F4]">
                          Uploading to Cloudinary… {templateProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-[#4285F4] h-1.5 rounded-full transition-all"
                          style={{ width: `${templateProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285F4]/10 to-[#34A853]/10
                                      flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4285F4" strokeWidth="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#4285F4"/>
                          <path d="M3 16l5-5 4 4 3-3 5 4" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-[#1A1A1A]">
                        {config.templateUrl ? 'Replace Template' : 'Upload Poster Template'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG · 1080×1350 px recommended · max 10 MB
                      </p>
                    </div>
                  )}
                </div>

                {templateError && (
                  <p className="text-xs text-[#EA4335] font-medium mt-2">{templateError}</p>
                )}

                <input
                  ref={templateFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setTemplateError('');
                    setTemplateUploading(true);
                    setTemplateProgress(0);
                    try {
                      const { uploadTemplate } = await import('../services/api');
                      const result = await uploadTemplate(
                        file,
                        config.slug || 'gemma4-kozhikode',
                        (pct) => setTemplateProgress(pct),
                        sessionEmail,
                        sessionPassword
                      );
                      // Persist to local config so canvas updates instantly
                      onUpdateConfig({
                        templateUrl:      result.templateUrl,
                        templatePublicId: result.publicId,
                      });
                    } catch (err) {
                      setTemplateError(err.message || 'Upload failed');
                    } finally {
                      setTemplateUploading(false);
                      setTemplateProgress(0);
                      // Clear input so same file can be re-selected
                      if (templateFileRef.current) templateFileRef.current.value = '';
                    }
                  }}
                />
              </section>

              <Divider />

              {/* Section: Multiple Custom Templates */}
              <section className="space-y-4">
                <SectionLabel icon="🗂️" label="Multiple Custom Templates" />
                <p className="text-xs text-slate-400 mt-1">
                  Upload role-specific or option-specific templates (e.g. Speaker, Volunteer, Attendee).
                  Users can select these templates via their corresponding keyword.
                </p>

                {/* Keyword Text Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Keyword / Role</label>
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="e.g. Speaker, Volunteer, Attendee"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold
                               focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]/20 transition-all"
                  />
                </div>

                {/* Upload Zone */}
                <div
                  onClick={() => {
                    if (!keywordInput.trim()) {
                      alert('Please specify a keyword/role first before selecting an image!');
                      return;
                    }
                    multiTemplateFileRef.current?.click();
                  }}
                  className={`
                    border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer
                    transition-all duration-200 group
                    ${!keywordInput.trim() ? 'opacity-50 cursor-not-allowed border-slate-200' : 
                      multiTemplateUploading
                        ? 'border-[#4285F4] bg-blue-50'
                        : 'border-slate-200 hover:border-[#4285F4] hover:bg-blue-50/40'}
                  `}
                >
                  {multiTemplateUploading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-[#4285F4]">
                          Uploading custom template... {multiTemplateProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-[#4285F4] h-1.5 rounded-full transition-all"
                          style={{ width: `${multiTemplateProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285F4]/10 to-[#34A853]/10
                                      flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4285F4" strokeWidth="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#4285F4"/>
                          <path d="M3 16l5-5 4 4 3-3 5 4" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-[#1A1A1A]">
                        Upload Template for "{keywordInput.trim() || 'Specified Keyword'}"
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG · max 10 MB
                      </p>
                    </div>
                  )}
                </div>

                {multiTemplateError && (
                  <p className="text-xs text-[#EA4335] font-medium mt-2">{multiTemplateError}</p>
                )}

                <input
                  ref={multiTemplateFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file || !keywordInput.trim()) return;
                    setMultiTemplateError('');
                    setMultiTemplateUploading(true);
                    setMultiTemplateProgress(0);
                    try {
                      const { uploadTemplate } = await import('../services/api');
                      const result = await uploadTemplate(
                        file,
                        config.slug || 'gemma4-kozhikode',
                        (pct) => setMultiTemplateProgress(pct),
                        sessionEmail,
                        sessionPassword,
                        keywordInput.trim()
                      );
                      // Update local config
                      onUpdateConfig(result.config || {
                        ...config,
                        templates: [
                          ...(config.templates || []).filter(t => t.keyword.toLowerCase() !== keywordInput.trim().toLowerCase()),
                          {
                            keyword: keywordInput.trim(),
                            templateUrl: result.templateUrl,
                            templatePublicId: result.publicId
                          }
                        ]
                      });
                      setKeywordInput('');
                    } catch (err) {
                      setMultiTemplateError(err.message || 'Upload failed');
                    } finally {
                      setMultiTemplateUploading(false);
                      setMultiTemplateProgress(0);
                      if (multiTemplateFileRef.current) multiTemplateFileRef.current.value = '';
                    }
                  }}
                />

                {/* List of uploaded custom templates */}
                {config.templates && config.templates.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uploaded Keyword Templates</label>
                    <div className="grid grid-cols-1 gap-2">
                      {config.templates.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 group">
                          <img
                            src={t.templateUrl}
                            alt={t.keyword}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-charcoal truncate">{t.keyword}</p>
                            <a
                              href={t.templateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-[#4285F4] hover:underline truncate block"
                            >
                              View Image
                            </a>
                          </div>
                          <button
                            onClick={async () => {
                              if (!confirm(`Remove the template for "${t.keyword}"?`)) return;
                              try {
                                const { removeTemplate } = await import('../services/api');
                                const res = await removeTemplate(config.slug || 'gemma4-kozhikode', sessionEmail, sessionPassword, t.keyword);
                                onUpdateConfig(res.config || {
                                  ...config,
                                  templates: (config.templates || []).filter(item => item.keyword.toLowerCase() !== t.keyword.toLowerCase())
                                });
                              } catch (err) {
                                setMultiTemplateError(err.message || 'Delete failed');
                              }
                            }}
                            className="text-[#EA4335] text-[10px] font-bold hover:underline px-2.5 py-1 rounded-lg hover:bg-[#EA4335]/5"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <Divider />

              {/* Section: Participant Photo Placement */}
              <section className="space-y-4">
                <SectionLabel icon="📸" label="Participant Photo Placement" />
                <p className="text-xs text-slate-400 mt-1">
                  Adjust the size, position, and shape of the participant's photo overlay on the poster canvas.
                </p>

                {/* Photo Shape Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Photo Shape</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ photoShape: 'circle' })}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        (config.photoShape || 'circle') === 'circle'
                          ? 'border-[#4285F4] bg-blue-50/50 text-[#4285F4]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ⚪ Circle Frame
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ photoShape: 'square' })}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        config.photoShape === 'square'
                          ? 'border-[#4285F4] bg-blue-50/50 text-[#4285F4]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ⬜ Rounded Square
                    </button>
                  </div>
                </div>

                {/* Live Interactive Preview Box */}
                <AdminPreview config={config} onUpdateConfig={onUpdateConfig} />

                {/* Slider: Horizontal X */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">Horizontal Position (X)</span>
                    <span className="font-semibold text-slate-500">{config.photoX ?? 540} px</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1030"
                    step="10"
                    value={config.photoX ?? 540}
                    onChange={(e) => onUpdateConfig({ photoX: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Left</span>
                    <span>Center (540)</span>
                    <span>Right</span>
                  </div>
                </div>

                {/* Slider: Vertical Y */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">Vertical Position (Y)</span>
                    <span className="font-semibold text-slate-500">{config.photoY ?? 470} px</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1300"
                    step="10"
                    value={config.photoY ?? 470}
                    onChange={(e) => onUpdateConfig({ photoY: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Top</span>
                    <span>Default (470)</span>
                    <span>Bottom</span>
                  </div>
                </div>

                {/* Slider: Photo Width */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">Photo Width</span>
                    <span className="font-semibold text-slate-500">{config.photoWidth ?? (config.photoRadius ? config.photoRadius * 2 : 400)} px</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="5"
                    value={config.photoWidth ?? (config.photoRadius ? config.photoRadius * 2 : 400)}
                    onChange={(e) => onUpdateConfig({ photoWidth: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>50 px</span>
                    <span>Default (400 px)</span>
                    <span>1000 px</span>
                  </div>
                </div>

                {/* Slider: Photo Height */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">Photo Height</span>
                    <span className="font-semibold text-slate-500">{config.photoHeight ?? (config.photoRadius ? config.photoRadius * 2 : 400)} px</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="5"
                    value={config.photoHeight ?? (config.photoRadius ? config.photoRadius * 2 : 400)}
                    onChange={(e) => onUpdateConfig({ photoHeight: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>50 px</span>
                    <span>Default (400 px)</span>
                    <span>1000 px</span>
                  </div>
                </div>

                {/* Slider: Photo Rotation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">Photo Rotation</span>
                    <span className="font-semibold text-slate-500">{config.photoRotation ?? 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={config.photoRotation ?? 0}
                    onChange={(e) => onUpdateConfig({ photoRotation: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>-180°</span>
                    <span>Straight (0°)</span>
                    <span>180°</span>
                  </div>
                </div>

                {/* ── Photo Background Fill ── */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎨</span> Photo Background
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ photoBackgroundEnabled: !config.photoBackgroundEnabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        config.photoBackgroundEnabled ? 'bg-[#34A853]' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        config.photoBackgroundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {config.photoBackgroundEnabled && (
                    <div className="space-y-4">
                      {/* Style: Solid vs Gradient */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateConfig({ photoBackgroundType: 'solid' })}
                          className={`py-2.5 text-xs font-bold rounded-xl border-2 transition-all ${
                            (!config.photoBackgroundType || config.photoBackgroundType === 'solid')
                              ? 'border-[#34A853] bg-[#34A853]/8 text-[#34A853]'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          ⬛ Solid
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateConfig({ photoBackgroundType: 'gradient' })}
                          className={`py-2.5 text-xs font-bold rounded-xl border-2 transition-all ${
                            config.photoBackgroundType === 'gradient'
                              ? 'border-[#4285F4] bg-[#4285F4]/8 text-[#4285F4]'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          🌈 Gradient
                        </button>
                      </div>

                      {/* Solid Color */}
                      {(!config.photoBackgroundType || config.photoBackgroundType === 'solid') && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-slate-600">Background Color</span>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={config.photoBackgroundColor ?? '#E8F0FE'}
                              onChange={(e) => onUpdateConfig({ photoBackgroundColor: e.target.value })}
                              className="w-10 h-10 rounded-xl border-2 border-slate-200 cursor-pointer p-0.5"
                            />
                            <div className="flex gap-2 flex-wrap">
                              {['#E8F0FE','#E6F4EA','#FFF3E0','#FCE8E6','#ffffff','#000000','#F3E8FF','#FEE2E2','#E0F2FE','#F0FDF4'].map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => onUpdateConfig({ photoBackgroundColor: c })}
                                  title={c}
                                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                                    config.photoBackgroundColor === c ? 'border-slate-700 scale-110' : 'border-white shadow'
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={config.photoBackgroundColor ?? '#E8F0FE'}
                            onChange={(e) => onUpdateConfig({ photoBackgroundColor: e.target.value })}
                            placeholder="#E8F0FE"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-[#34A853] focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Gradient */}
                      {config.photoBackgroundType === 'gradient' && (
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-slate-600">Gradient Presets</span>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Blue–Green', c1: '#4285F4', c2: '#34A853' },
                              { label: 'Sunset',     c1: '#F97316', c2: '#EA4335' },
                              { label: 'Purple',     c1: '#8B5CF6', c2: '#F472B6' },
                              { label: 'Ocean',      c1: '#06B6D4', c2: '#4285F4' },
                              { label: 'Gold',       c1: '#FBBC04', c2: '#F97316' },
                              { label: 'Mint',       c1: '#34A853', c2: '#06B6D4' },
                            ].map(({ label, c1, c2 }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => onUpdateConfig({ photoBackgroundGradientStart: c1, photoBackgroundGradientEnd: c2 })}
                                className="rounded-xl h-8 border-2 border-white shadow text-[10px] font-bold text-white transition-transform hover:scale-105"
                                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-semibold">Start Color</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={config.photoBackgroundGradientStart ?? '#4285F4'}
                                  onChange={(e) => onUpdateConfig({ photoBackgroundGradientStart: e.target.value })}
                                  className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                />
                                <input
                                  type="text"
                                  value={config.photoBackgroundGradientStart ?? '#4285F4'}
                                  onChange={(e) => onUpdateConfig({ photoBackgroundGradientStart: e.target.value })}
                                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono focus:border-[#4285F4] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-semibold">End Color</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={config.photoBackgroundGradientEnd ?? '#34A853'}
                                  onChange={(e) => onUpdateConfig({ photoBackgroundGradientEnd: e.target.value })}
                                  className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                />
                                <input
                                  type="text"
                                  value={config.photoBackgroundGradientEnd ?? '#34A853'}
                                  onChange={(e) => onUpdateConfig({ photoBackgroundGradientEnd: e.target.value })}
                                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono focus:border-[#34A853] focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Preview strip */}
                          <div
                            className="h-6 rounded-xl border border-slate-200 shadow-inner"
                            style={{
                              background: `linear-gradient(135deg, ${config.photoBackgroundGradientStart ?? '#4285F4'}, ${config.photoBackgroundGradientEnd ?? '#34A853'})`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Photo Border ── */}

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🖼️</span> Photo Border
                    </span>
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => onUpdateConfig({ photoBorderEnabled: !config.photoBorderEnabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        config.photoBorderEnabled ? 'bg-[#4285F4]' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        config.photoBorderEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {config.photoBorderEnabled && (
                    <div className="space-y-4">
                      {/* Border Width */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-600">Border Width</span>
                          <span className="font-semibold text-slate-500">{config.photoBorderWidth ?? 8} px</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="40"
                          step="1"
                          value={config.photoBorderWidth ?? 8}
                          onChange={(e) => onUpdateConfig({ photoBorderWidth: parseInt(e.target.value) })}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Thin (2px)</span>
                          <span>Default (8px)</span>
                          <span>Thick (40px)</span>
                        </div>
                      </div>

                      {/* Border Type: Solid vs Gradient */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">Border Style</span>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => onUpdateConfig({ photoBorderType: 'solid' })}
                            className={`py-2.5 text-xs font-bold rounded-xl border-2 transition-all ${
                              (!config.photoBorderType || config.photoBorderType === 'solid')
                                ? 'border-[#4285F4] bg-[#4285F4]/8 text-[#4285F4]'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            ⬤ Solid
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateConfig({ photoBorderType: 'gradient' })}
                            className={`py-2.5 text-xs font-bold rounded-xl border-2 transition-all ${
                              config.photoBorderType === 'gradient'
                                ? 'border-[#34A853] bg-[#34A853]/8 text-[#34A853]'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            🌈 Gradient
                          </button>
                        </div>
                      </div>

                      {/* Solid color picker */}
                      {(!config.photoBorderType || config.photoBorderType === 'solid') && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-slate-600">Border Color</span>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={config.photoBorderColor ?? '#4285F4'}
                              onChange={(e) => onUpdateConfig({ photoBorderColor: e.target.value })}
                              className="w-10 h-10 rounded-xl border-2 border-slate-200 cursor-pointer p-0.5"
                            />
                            <div className="flex gap-2 flex-wrap">
                              {['#4285F4','#34A853','#FBBC04','#EA4335','#ffffff','#000000','#8B5CF6','#F472B6','#06B6D4','#F97316'].map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => onUpdateConfig({ photoBorderColor: c })}
                                  title={c}
                                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                                    config.photoBorderColor === c ? 'border-slate-700 scale-110' : 'border-white shadow'
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={config.photoBorderColor ?? '#4285F4'}
                            onChange={(e) => onUpdateConfig({ photoBorderColor: e.target.value })}
                            placeholder="#4285F4"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-[#4285F4] focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Gradient pickers */}
                      {config.photoBorderType === 'gradient' && (
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-slate-600">Gradient Presets</span>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Google', c1: '#4285F4', c2: '#34A853' },
                              { label: 'Sunset', c1: '#F97316', c2: '#EA4335' },
                              { label: 'Purple', c1: '#8B5CF6', c2: '#F472B6' },
                              { label: 'Ocean', c1: '#06B6D4', c2: '#4285F4' },
                              { label: 'Gold',   c1: '#FBBC04', c2: '#F97316' },
                              { label: 'Forest', c1: '#34A853', c2: '#06B6D4' },
                            ].map(({ label, c1, c2 }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => onUpdateConfig({ photoBorderGradientStart: c1, photoBorderGradientEnd: c2 })}
                                className="rounded-xl h-8 border-2 border-white shadow text-[10px] font-bold text-white transition-transform hover:scale-105"
                                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                                title={label}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          <span className="text-xs font-semibold text-slate-600 block">Custom Gradient Colors</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-semibold">Start Color</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={config.photoBorderGradientStart ?? '#4285F4'}
                                  onChange={(e) => onUpdateConfig({ photoBorderGradientStart: e.target.value })}
                                  className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                />
                                <input
                                  type="text"
                                  value={config.photoBorderGradientStart ?? '#4285F4'}
                                  onChange={(e) => onUpdateConfig({ photoBorderGradientStart: e.target.value })}
                                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono focus:border-[#4285F4] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-semibold">End Color</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={config.photoBorderGradientEnd ?? '#34A853'}
                                  onChange={(e) => onUpdateConfig({ photoBorderGradientEnd: e.target.value })}
                                  className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                />
                                <input
                                  type="text"
                                  value={config.photoBorderGradientEnd ?? '#34A853'}
                                  onChange={(e) => onUpdateConfig({ photoBorderGradientEnd: e.target.value })}
                                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono focus:border-[#34A853] focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Live gradient preview strip */}
                          <div
                            className="h-6 rounded-xl border border-slate-200 shadow-inner"
                            style={{
                              background: `linear-gradient(135deg, ${config.photoBorderGradientStart ?? '#4285F4'}, ${config.photoBorderGradientEnd ?? '#34A853'})`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reset Photo Position Button */}
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ photoX: 540, photoY: 470, photoRadius: 200, photoWidth: 400, photoHeight: 400, photoShape: 'circle', photoRotation: 0 })}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-[#4285F4]
                             bg-slate-50 hover:bg-blue-50/30 border border-slate-200 hover:border-[#4285F4]/30
                             rounded-xl transition-all"
                >
                  ↩️ Reset Photo Placement to Defaults
                </button>
              </section>


              <Divider />

              {/* Section: Page Background Image */}
              <section>
                <SectionLabel icon="🎨" label="Page Background Image" />
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Upload a custom image for the landing page background. It will be stored in your
                  <span className="font-semibold text-[#34A853]"> Cloudinary / gemma 4 / backgrounds</span> folder.
                  If empty, the default Sahya Building sketch will be used.
                </p>

                {/* Current background preview */}
                {config.backgroundImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#34A853]/30 mb-3 group">
                    <img
                      src={config.backgroundImageUrl}
                      alt="Current background"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <button
                        onClick={async () => {
                          if (!confirm('Remove this custom background? The landing page will revert to the default building sketch background.')) return;
                          try {
                            const { removeBackground } = await import('../services/api');
                            await removeBackground(config.slug || 'gemma4-kozhikode', sessionEmail, sessionPassword);
                            onUpdateConfig({ backgroundImageUrl: null, backgroundImagePublicId: null });
                          } catch (e) {
                            setBgError('Failed to remove background image');
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                                   bg-[#EA4335] text-white text-xs font-semibold
                                   px-4 py-2 rounded-xl shadow-lg"
                        id="remove-bg-btn"
                      >
                        ✕ Remove Background
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-[#34A853]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ACTIVE
                    </div>
                  </div>
                ) : null}

                {/* Upload zone */}
                <div
                  onClick={() => bgFileRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer
                    transition-all duration-200 group
                    ${
                      bgUploading
                        ? 'border-[#4285F4] bg-blue-50'
                        : 'border-slate-200 hover:border-[#4285F4] hover:bg-blue-50/40'
                    }
                  `}
                  id="bg-upload-zone"
                >
                  {bgUploading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-[#4285F4]">
                          Uploading to Cloudinary… {bgProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-[#4285F4] h-1.5 rounded-full transition-all"
                          style={{ width: `${bgProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285F4]/10 to-[#34A853]/10
                                      flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4285F4" strokeWidth="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#4285F4"/>
                          <path d="M3 16l5-5 4 4 3-3 5 4" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-[#1A1A1A]">
                        {config.backgroundImageUrl ? 'Replace Background' : 'Upload Background Image'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG · max 10 MB
                      </p>
                    </div>
                  )}
                </div>

                {bgError && (
                  <p className="text-xs text-[#EA4335] font-medium mt-2">{bgError}</p>
                )}

                <input
                  ref={bgFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setBgError('');
                    setBgUploading(true);
                    setBgProgress(0);
                    try {
                      const { uploadBackground } = await import('../services/api');
                      const result = await uploadBackground(
                        file,
                        config.slug || 'gemma4-kozhikode',
                        (pct) => setBgProgress(pct),
                        sessionEmail,
                        sessionPassword
                      );
                      // Persist to local config
                      onUpdateConfig({
                        backgroundImageUrl:      result.backgroundImageUrl,
                        backgroundImagePublicId: result.publicId,
                      });
                    } catch (err) {
                      setBgError(err.message || 'Upload failed');
                    } finally {
                      setBgUploading(false);
                      setBgProgress(0);
                      if (bgFileRef.current) bgFileRef.current.value = '';
                    }
                  }}
                />

                {config.backgroundImageUrl && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Background Image Opacity</span>
                      <span className="text-slate-700 font-bold">
                        {100 - (config.backgroundOpacity !== undefined ? config.backgroundOpacity : 93)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Adjust how strongly the background image shows through.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={100 - (config.backgroundOpacity !== undefined ? config.backgroundOpacity : 93)}
                        onChange={(e) => {
                          const visibility = parseInt(e.target.value, 10);
                          onUpdateConfig({ backgroundOpacity: 100 - visibility });
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                      />
                    </div>
                  </div>
                )}
              </section>

              <Divider />

              {/* Section: Event Info Banner */}
              <section>
                <SectionLabel icon="🖼️" label="Event Info Banner" />
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  Upload a custom banner image for the Event Information section. Recommended size: <span className="font-bold text-slate-700">1200×600 px</span> (exact <span className="font-semibold text-slate-700">2:1 aspect ratio</span>) to fit the banner space without cropping.
                </p>

                {/* Current banner preview */}
                {config.bannerUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#34A853]/30 mb-3 group">
                    <img
                      src={config.bannerUrl}
                      alt="Current event banner"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <button
                        onClick={async () => {
                          if (!confirm('Remove this custom banner? The event card will revert to the default building sketch.')) return;
                          try {
                            const { removeBanner } = await import('../services/api');
                            await removeBanner(config.slug || 'gemma4-kozhikode', sessionEmail, sessionPassword);
                            onUpdateConfig({ bannerUrl: null, bannerPublicId: null });
                          } catch (e) {
                            setBannerError('Failed to remove banner image');
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                                   bg-[#EA4335] text-white text-xs font-semibold
                                   px-4 py-2 rounded-xl shadow-lg"
                        id="remove-banner-btn"
                      >
                        ✕ Remove Banner
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 bg-[#34A853]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ACTIVE
                    </div>
                  </div>
                ) : null}

                {/* Upload zone */}
                <div
                  onClick={() => bannerFileRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer
                    transition-all duration-200 group
                    ${
                      bannerUploading
                        ? 'border-[#4285F4] bg-blue-50'
                        : 'border-slate-200 hover:border-[#4285F4] hover:bg-blue-50/40'
                    }
                  `}
                  id="banner-upload-zone"
                >
                  {bannerUploading ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-[#4285F4]">
                          Uploading to Cloudinary… {bannerProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-[#4285F4] h-1.5 rounded-full transition-all"
                          style={{ width: `${bannerProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285F4]/10 to-[#34A853]/10
                                      flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4285F4" strokeWidth="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#4285F4"/>
                          <path d="M3 16l5-5 4 4 3-3 5 4" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-[#1A1A1A]">
                        {config.bannerUrl ? 'Replace Banner Image' : 'Upload Banner Image'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PNG, JPG · 1200×600 px recommended · max 10 MB
                      </p>
                    </div>
                  )}
                </div>

                {bannerError && (
                  <p className="text-xs text-[#EA4335] font-medium mt-2">{bannerError}</p>
                )}

                <input
                  ref={bannerFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setBannerError('');
                    setBannerUploading(true);
                    setBannerProgress(0);
                    try {
                      const { uploadBanner } = await import('../services/api');
                      const result = await uploadBanner(
                        file,
                        config.slug || 'gemma4-kozhikode',
                        (pct) => setBannerProgress(pct),
                        sessionEmail,
                        sessionPassword
                      );
                      // Persist to local config
                      onUpdateConfig({
                        bannerUrl:      result.bannerUrl,
                        bannerPublicId: result.publicId,
                      });
                    } catch (err) {
                      setBannerError(err.message || 'Upload failed');
                    } finally {
                      setBannerUploading(false);
                      setBannerProgress(0);
                      if (bannerFileRef.current) bannerFileRef.current.value = '';
                    }
                  }}
                />
              </section>

              <Divider />

              {/* Section: Event Details */}
              <section>
                <SectionLabel icon="📋" label="Event Details" />
                <div className="space-y-3 mt-3">
                  <Field
                    label="Location"
                    id="admin-location-field"
                    value={config.location}
                    onChange={(v) => onUpdateConfig({ location: v })}
                    multiline
                    placeholder="e.g. KOZHIKODE – IOCOD, Sahya Building"
                  />
                  <Field
                    label="Date"
                    id="admin-date-field"
                    value={config.date}
                    onChange={(v) => onUpdateConfig({ date: v })}
                    placeholder="e.g. Sunday, June 21, 2026"
                  />
                  <Field
                    label="Time"
                    id="admin-time-field"
                    value={config.time}
                    onChange={(v) => onUpdateConfig({ time: v })}
                    placeholder="e.g. 10:30 AM"
                  />
                </div>
              </section>

              <Divider />

              {/* Section: Partners */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel icon="🤝" label="Event Partners" inline />
                  <button
                    id="add-partner-btn"
                    onClick={() => onAddPartner()}
                    className="text-xs font-semibold text-[#4285F4] border border-[#4285F4]/30
                               rounded-lg px-3 py-1.5 hover:bg-[#4285F4]/5 transition-colors flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    Add Partner
                  </button>
                </div>
                <div className="space-y-2">
                  {config.partners.map((partner) => (
                    <PartnerRow
                      key={partner.id}
                      partner={partner}
                      onUpdate={onUpdatePartner}
                      onRemove={onRemovePartner}
                      onLogoUpload={(id, logo) => onUpdatePartner(id, { logo })}
                    />
                  ))}
                </div>
              </section>

              <Divider />

              {/* Section: Analytics Stats */}
              {stats && (
                <>
                  <Divider />
                  <section>
                    <SectionLabel icon="📊" label="Poster Stats" />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {[
                        { label: 'Total Generated', value: stats.total, color: '#4285F4' },
                        { label: 'Downloaded', value: stats.downloaded, color: '#34A853' },
                        { label: 'BG Removed', value: stats.withBgRemoval, color: '#FBBC04' },
                        { label: 'Last 7 Days', value: stats.last7Days, color: '#EA4335' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-xl font-bold" style={{ color }}>{value}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                    {apiOk !== undefined && (
                      <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                        apiOk ? 'text-[#34A853]' : 'text-[#FBBC04]'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          apiOk ? 'bg-[#34A853]' : 'bg-[#FBBC04]'
                        }`} />
                        {apiOk
                          ? syncing ? 'Syncing to MongoDB…' : 'Synced to MongoDB'
                          : 'Offline — changes cached locally'}
                      </div>
                    )}
                  </section>
                </>
              )}

              <Divider />

              {/* Section: Advanced Theme Options */}
              <section>
                <details className="group border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <summary className="flex items-center justify-between cursor-pointer list-none select-none">
                    <div className="flex items-center gap-2">
                      <SectionLabel icon="🎨" label="Advanced Theme Options" inline />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-4 space-y-4 pt-1">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Customize the color palette of all page elements (buttons, accents, labels, text colors).
                    </p>

                    <div className="space-y-3">
                      {/* Primary Color */}
                      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">Primary Color</span>
                          <span className="text-[10px] text-slate-400">Buttons & Sparkles</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.themePrimary || '#4285F4'}
                            onChange={(e) => onUpdateConfig({ themePrimary: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 outline-none p-0 flex-shrink-0"
                          />
                          <span className="text-xs font-mono font-bold text-slate-700 w-16">
                            {config.themePrimary || '#4285F4'}
                          </span>
                        </div>
                      </div>

                      {/* Secondary Color */}
                      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">Secondary Color</span>
                          <span className="text-[10px] text-slate-400">Accents & Highlights</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.themeSecondary || '#34A853'}
                            onChange={(e) => onUpdateConfig({ themeSecondary: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 outline-none p-0 flex-shrink-0"
                          />
                          <span className="text-xs font-mono font-bold text-slate-700 w-16">
                            {config.themeSecondary || '#34A853'}
                          </span>
                        </div>
                      </div>

                      {/* Dark Text Color */}
                      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">Text Color</span>
                          <span className="text-[10px] text-slate-400">Main Headings & Text</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.themeDark || '#1A1A1A'}
                            onChange={(e) => onUpdateConfig({ themeDark: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 outline-none p-0 flex-shrink-0"
                          />
                          <span className="text-xs font-mono font-bold text-slate-700 w-16">
                            {config.themeDark || '#1A1A1A'}
                          </span>
                        </div>
                      </div>

                      {/* Card Background Color */}
                      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">Card Background Color</span>
                          <span className="text-[10px] text-slate-400">Location, Date & Partner Cards</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.themeCardBg || '#FFFFFF'}
                            onChange={(e) => onUpdateConfig({ themeCardBg: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 outline-none p-0 flex-shrink-0"
                          />
                          <span className="text-xs font-mono font-bold text-slate-700 w-16">
                            {config.themeCardBg || '#FFFFFF'}
                          </span>
                        </div>
                      </div>

                      {/* Card Background Opacity */}
                      <div className="space-y-1 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">Card Opacity</span>
                          <span className="font-semibold text-slate-500">{config.themeCardOpacity ?? 75}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={config.themeCardOpacity ?? 75}
                          onChange={(e) => onUpdateConfig({ themeCardOpacity: parseInt(e.target.value) })}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Transparent (0%)</span>
                          <span>Solid (100%)</span>
                        </div>
                      </div>

                      {/* Header/Footer Background Color */}
                      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">Header/Footer Background</span>
                          <span className="text-[10px] text-slate-400">Top and Bottom Bars Color</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.themeHeaderBg || '#F8F9FA'}
                            onChange={(e) => onUpdateConfig({ themeHeaderBg: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 outline-none p-0 flex-shrink-0"
                          />
                          <span className="text-xs font-mono font-bold text-slate-700 w-16">
                            {config.themeHeaderBg || '#F8F9FA'}
                          </span>
                        </div>
                      </div>

                      {/* Header/Footer Background Opacity */}
                      <div className="space-y-1 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">Header/Footer Opacity</span>
                          <span className="font-semibold text-slate-500">{config.themeHeaderBgOpacity ?? 85}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={config.themeHeaderBgOpacity ?? 85}
                          onChange={(e) => onUpdateConfig({ themeHeaderBgOpacity: parseInt(e.target.value) })}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4285F4]"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Transparent (0%)</span>
                          <span>Solid (100%)</span>
                        </div>
                      </div>

                      {/* Header/Footer Text Color */}
                      <div className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-700">Header/Footer Text Color</span>
                          <span className="text-[10px] text-slate-400">Bar text & Button Labels</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.themeHeaderText || '#1A1A1A'}
                            onChange={(e) => onUpdateConfig({ themeHeaderText: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 outline-none p-0 flex-shrink-0"
                          />
                          <span className="text-xs font-mono font-bold text-slate-700 w-16">
                            {config.themeHeaderText || '#1A1A1A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onUpdateConfig({
                          themePrimary: '#4285F4',
                          themeSecondary: '#34A853',
                          themeDark: '#1A1A1A',
                          themeCardBg: '#FFFFFF',
                          themeCardOpacity: 75,
                          themeHeaderBg: '#F8F9FA',
                          themeHeaderBgOpacity: 85,
                          themeHeaderText: '#1A1A1A',
                        })}
                        className="text-[10px] font-bold text-slate-400 hover:text-gemma-blue transition-colors uppercase tracking-wider"
                      >
                        Reset Theme Colors
                      </button>
                    </div>
                  </div>
                </details>
              </section>

              <Divider />

              {/* Section: Access Control */}
              <section>
                <SectionLabel icon="🔐" label="Access Control" />
                <div className="space-y-4 mt-3">
                  {/* Creator Email */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Creator Email (Owner)</label>
                    <input
                      type="email"
                      value={config.adminEmail || ''}
                      onChange={(e) => {
                        if (isMaster) {
                          onUpdateConfig({ adminEmail: e.target.value });
                        }
                      }}
                      disabled={!isMaster}
                      placeholder={config.adminEmail ? "" : "Unclaimed event"}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all
                        ${isMaster ? 'border-slate-200 focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4] bg-white text-[#1A1A1A]' : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                    />
                    {!isMaster && (
                      <p className="text-[10px] text-slate-400 mt-1">Only the master admin can change the creator email.</p>
                    )}
                  </div>

                  {/* Event Password */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Event Password</label>
                    <input
                      type="text"
                      value={config.adminPassword || ''}
                      onChange={(e) => onUpdateConfig({ adminPassword: e.target.value })}
                      placeholder="No password set"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4] bg-white text-[#1A1A1A]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Organizers and whitelisted friends use this password to access this event.</p>
                  </div>

                  {/* Allowed Emails (Friends) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Whitelisted Friends (Allowed Emails)</label>
                    <textarea
                      value={(config.allowedEmails || []).join(', ')}
                      onChange={(e) => {
                        const emails = e.target.value
                          .split(',')
                          .map(email => email.trim())
                          .filter(email => email.length > 0);
                        onUpdateConfig({ allowedEmails: emails });
                      }}
                      placeholder="friend1@example.com, friend2@example.com"
                      rows="2"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4] bg-white text-[#1A1A1A] resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Comma-separated list of emails that can customize this event using the event password.</p>
                  </div>
                </div>
              </section>

              <Divider />

              {/* Danger zone */}
              <section>
                <SectionLabel icon="⚠️" label="Danger Zone" />
                <div className="mt-3 p-4 rounded-xl border border-[#EA4335]/20 bg-[#EA4335]/4">
                  <p className="text-xs text-slate-500 mb-3">Reset all event configuration to defaults.</p>
                  <button
                    id="reset-config-btn"
                    onClick={() => {
                      if (confirm('Reset all event settings to defaults?')) {
                        onUpdateConfig({
                          location: 'KOZHIKODE – IOCOD, Sahya Building, Govt. Cyber Park',
                          date: 'Sunday, June 21, 2026',
                          time: '10:30 AM',
                          headerLogo: null,
                          headerLogoHeight: 40,
                          photoX: 540,
                          photoY: 470,
                          photoRadius: 200,
                          photoWidth: 400,
                          photoHeight: 400,
                          photoShape: 'circle',
                          photoRotation: 0,
                          backgroundOpacity: 93,
                          themePrimary: '#4285F4',
                          themeSecondary: '#34A853',
                          themeDark: '#1A1A1A',
                          themeCardBg: '#FFFFFF',
                          themeCardOpacity: 75,
                          themeHeaderBg: '#F8F9FA',
                          themeHeaderBgOpacity: 85,
                          themeHeaderText: '#1A1A1A',
                        });
                      }
                    }}
                    className="text-xs font-semibold text-[#EA4335] border border-[#EA4335]/40
                               rounded-lg px-3 py-1.5 hover:bg-[#EA4335]/8 transition-colors"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </section>

              <div className="h-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, label, inline = false }) {
  if (inline) {
    return (
      <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
        {icon} {label}
      </span>
    );
  }
  return (
    <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-1">
      {icon} {label}
    </h3>
  );
}

function Field({ label, id, value, onChange, placeholder, multiline }) {
  const cls = `w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium
    text-[#1A1A1A] bg-white placeholder:text-slate-300
    focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 focus:border-[#4285F4]
    transition-all resize-none`;

  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-slate-400 block mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={cls}
        />
      ) : (
        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-100" />;
}
