import SparkleIcon from './SparkleIcon';

export default function Header({ config, onOrganizerClick }) {
  return (
    <header
      id="site-header"
      className="sticky top-0 z-40 w-full transition-all duration-200"
      style={{
        background: 'var(--color-header-bg)',
        color: 'var(--color-header-text)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.4)',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
        {/* Logo / Event Identity */}
        <div className="flex items-center gap-3">
          {config.headerLogo ? (
            <img
              src={config.headerLogo}
              alt="Event Logo"
              style={{ height: config.headerLogoHeight || 40 }}
              className="w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Poster Gen Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-sm border border-white/20"
              />
              <div>
                <div className="font-display font-black text-base leading-tight" style={{ color: 'var(--color-header-text)' }}>
                  Poster Gen
                </div>
                <div className="text-[10px] opacity-70 font-medium tracking-wide" style={{ color: 'var(--color-header-text)' }}>
                  Custom Event Posters
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right side: route badge + organizer button */}
        <div className="flex items-center gap-3">
          {/* Home Button */}
          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold
                       hover:bg-black/5 hover:text-[var(--color-header-text)] transition-all cursor-pointer"
            style={{ color: 'var(--color-header-text)' }}
          >
            🏠 Home
          </button>

          {/* Route badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          bg-black/5 border border-black/10">
            <div className="w-1.5 h-1.5 rounded-full bg-gemma-green animate-pulse" />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-header-text)' }}>/events/{config.slug || 'gemma4-kozhikode'}</span>
          </div>

          {/* Organizer login */}
          <button
            id="organizer-login-btn"
            onClick={onOrganizerClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                       border bg-white/80 backdrop-blur-sm
                       hover:shadow-glass hover:bg-white
                       active:scale-95 transition-all duration-200 cursor-pointer"
            style={{
              color: 'var(--color-header-text)',
              borderColor: 'rgba(148, 163, 184, 0.3)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Organizer Panel
          </button>
        </div>
      </div>
    </header>
  );
}
