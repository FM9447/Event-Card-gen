import { useRef, useEffect, useState } from 'react';
import { POSTER_DIMS } from '../utils/canvasUtils';

export default function AdminPreview({ config, onUpdateConfig }) {
  const containerRef = useRef(null);
  const [templateSize, setTemplateSize] = useState({ w: POSTER_DIMS.w, h: POSTER_DIMS.h });

  useEffect(() => {
    if (!config.templateUrl) {
      setTemplateSize({ w: POSTER_DIMS.w, h: POSTER_DIMS.h });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const aspect = (img.naturalWidth || POSTER_DIMS.w) / (img.naturalHeight || POSTER_DIMS.h);
      setTemplateSize({ w: POSTER_DIMS.w, h: Math.round(POSTER_DIMS.w / aspect) });
    };
    img.src = config.templateUrl;
  }, [config.templateUrl]);

  // Handle drag to move photo
  const handleDrag = (e) => {
    if (e.buttons !== 1) return; // Only left click drag
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = templateSize.w / rect.width;
    const scaleY = templateSize.h / rect.height;
    
    // Calculate new X, Y relative to original template size
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // clamp bounds
    const clampedX = Math.max(0, Math.min(templateSize.w, x));
    const clampedY = Math.max(0, Math.min(templateSize.h, y));

    onUpdateConfig({ photoX: Math.round(clampedX), photoY: Math.round(clampedY) });
  };

  const photoW = config.photoWidth ?? (config.photoRadius ? config.photoRadius * 2 : 400);
  const photoH = config.photoHeight ?? (config.photoRadius ? config.photoRadius * 2 : 400);
  const photoX = config.photoX ?? (templateSize.w / 2);
  const photoY = config.photoY ?? 470;

  // percentages for positioning overlay
  const leftPct = (photoX / templateSize.w) * 100;
  const topPct = (photoY / templateSize.h) * 100;
  const wPct = (photoW / templateSize.w) * 100;
  const hPct = (photoH / templateSize.h) * 100;

  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center justify-between">
         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interactive Preview</p>
         <p className="text-[10px] text-slate-400">Click & Drag to move</p>
      </div>
      <div 
        ref={containerRef}
        className="w-full max-w-[280px] mx-auto relative bg-slate-100 rounded-xl overflow-hidden cursor-crosshair border border-slate-200 shadow-inner"
        style={{ aspectRatio: `${templateSize.w} / ${templateSize.h}` }}
        onMouseMove={handleDrag}
        onMouseDown={handleDrag}
      >
        {/* Background */}
        {config.templateUrl ? (
          <img src={config.templateUrl} alt="Template" className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        )}
        
        {/* Photo Overlay Box */}
        <div 
          className="absolute border-[1.5px] border-dashed border-[#4285F4] bg-[#4285F4]/10 pointer-events-none shadow-sm flex items-center justify-center transition-all duration-75"
          style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            width: `${wPct}%`,
            height: `${hPct}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: config.photoShape === 'circle' ? '50%' : '8px'
          }}
        >
          <div className="w-1.5 h-1.5 bg-[#4285F4] rounded-full shadow" />
        </div>
      </div>
    </div>
  );
}
