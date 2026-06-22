import SparkleIcon from './SparkleIcon';

export default function Header({ config, onOrganizerClick, isLoggedIn }) {
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
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Event Identity */}
        <div className="flex items-center gap-3">
          {config.headerLogo ? (
            <img
              src={config.headerLogo}
              alt="Event Logo"
              style={{ height: config.headerLogoHeight || 32 }}
              className="w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Poster Gen Logo"
                className="w-8 h-8 rounded-lg object-cover shadow-sm border border-white/20"
              />
              <div>
                <div className="font-display font-black text-xs leading-tight" style={{ color: 'var(--color-header-text)' }}>
                  Poster Gen
                </div>
                <div className="text-[8px] opacity-70 font-medium tracking-wide" style={{ color: 'var(--color-header-text)' }}>
                  Custom Posters
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right side: home button + organizer button */}
        <div className="flex items-center gap-2">
          {/* Home Button */}
          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold
                       hover:bg-black/5 hover:text-[var(--color-header-text)] transition-all cursor-pointer"
            style={{ color: 'var(--color-header-text)' }}
          >
            🏠 Home
          </button>

          {/* Organizer login */}
          {isLoggedIn && (
            <button
              id="organizer-login-btn"
              onClick={onOrganizerClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                         border bg-white/80 backdrop-blur-sm
                         hover:shadow-glass hover:bg-white
                         active:scale-95 transition-all duration-200 cursor-pointer"
              style={{
                color: 'var(--color-header-text)',
                borderColor: 'rgba(148, 163, 184, 0.2)',
              }}
            >
              ⚙️ Panel
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
