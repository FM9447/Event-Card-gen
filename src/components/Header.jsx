import SparkleIcon from './SparkleIcon';

export default function Header({ config, onOrganizerClick }) {
  return (
    <header
      id="site-header"
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(248,249,250,0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
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
              {/* Gemma "G" icon */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gemma-blue to-gemma-green
                              flex items-center justify-center shadow-glass">
                <SparkleIcon size={18} color="white" animate />
              </div>
              <div>
                <div className="font-display font-bold text-charcoal text-base leading-tight">
                   Explore{' '}
                  <span className="text-gradient">Gemma 4</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Kozhikode · June 21, 2026
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
                       text-slate-500 hover:text-gemma-blue hover:bg-slate-50 transition-all cursor-pointer"
          >
            🏠 Home
          </button>

          {/* Route badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          bg-gemma-blue/8 border border-gemma-blue/20">
            <div className="w-1.5 h-1.5 rounded-full bg-gemma-green animate-pulse" />
            <span className="text-xs font-semibold text-gemma-blue">/events/{config.slug || 'gemma4-kozhikode'}</span>
          </div>

          {/* Organizer login */}
          <button
            id="organizer-login-btn"
            onClick={onOrganizerClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                       border border-slate-200 text-charcoal bg-white
                       hover:border-gemma-blue hover:text-gemma-blue hover:shadow-glass
                       active:scale-95 transition-all duration-200 cursor-pointer"
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
