import SparkleIcon from './SparkleIcon';

export default function InfoCards({ config }) {
  return (
    <div className="space-y-4">
      {/* Location card */}
      <div
        id="location-card"
        className="glass-card rounded-2xl p-5 animate-[fadeIn_0.5s_ease-out]"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gemma-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="var(--color-gemma-green)"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-bold text-gemma-green uppercase tracking-wider">Location</span>
              <SparkleIcon size={10} color="var(--color-gemma-green)" />
            </div>
            <p className="text-sm font-semibold text-charcoal leading-snug">{config.location}</p>
          </div>
        </div>
      </div>

      {/* Date & Time card */}
      <div
        id="datetime-card"
        className="glass-card rounded-2xl p-5 animate-[fadeIn_0.6s_ease-out]"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gemma-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="var(--color-gemma-blue)" strokeWidth="2"/>
              <path d="M8 2v4M16 2v4M3 10h18" stroke="var(--color-gemma-blue)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="8" cy="15" r="1.5" fill="var(--color-gemma-blue)"/>
              <circle cx="12" cy="15" r="1.5" fill="var(--color-gemma-blue)"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-bold text-gemma-blue uppercase tracking-wider">Date & Time</span>
              <SparkleIcon size={10} color="var(--color-gemma-blue)" />
            </div>
            <p className="text-sm font-semibold text-charcoal">{config.date}</p>
            <p className="text-sm text-slate-500 mt-0.5">⏰ {config.time}</p>
          </div>
        </div>
      </div>

      {/* Event Highlight card */}
      <div
        id="event-highlight-card"
        className="rounded-2xl p-5 animate-[fadeIn_0.7s_ease-out]
                   bg-gradient-to-br from-gemma-blue to-gemma-green relative overflow-hidden"
      >
        {/* Background sparkles */}
        <div className="absolute top-2 right-3 opacity-30">
          <SparkleIcon size={32} color="white" animate />
        </div>
        <div className="absolute bottom-2 right-10 opacity-20">
          <SparkleIcon size={20} color="white" />
        </div>

        <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2">About this Event</p>
        <p className="text-sm font-semibold text-white leading-relaxed">
          Explore the capabilities of Google's latest open-weight AI model, Gemma 4.
          Hands-on sessions, live demos & networking with Kerala's AI community.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-white/60" />
          <span className="text-xs text-white/80 font-medium">Free · Open to All</span>
        </div>
      </div>
    </div>
  );
}
