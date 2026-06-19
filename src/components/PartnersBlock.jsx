import SparkleIcon from './SparkleIcon';

export default function PartnersBlock({ partners, themePrimary = '#4285F4', themeSecondary = '#34A853' }) {
  const brandColors = [themePrimary, themeSecondary, '#FBBC04', '#EA4335', themePrimary, themeSecondary];

  return (
    <div
      id="partners-block"
      className="glass-card rounded-2xl p-5 animate-[fadeIn_0.8s_ease-out]"
    >
      <div className="flex items-center gap-2 mb-4">
        <SparkleIcon size={14} color="var(--color-gemma-blue)" animate />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Partners & Associations</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {partners.map((partner, i) => {
          const color = brandColors[i % brandColors.length];
          return (
            <div
              key={partner.id}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl
                         bg-white border border-slate-100 hover:border-gemma-blue/30
                         hover:shadow-[0_4px_12px_rgba(66,133,244,0.12)]
                         transition-all duration-200 group cursor-default"
              title={partner.name}
            >
              {partner.logo ? (
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)`, border: `1.5px solid ${color}44` }}
                >
                  <span style={{ color }} className="font-bold text-xs">
                    {partner.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight group-hover:text-charcoal transition-colors">
                {partner.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
