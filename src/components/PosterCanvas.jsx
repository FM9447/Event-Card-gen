import { useEffect, useRef, useCallback, useState } from 'react';
import { drawPoster, POSTER_DIMS } from '../utils/canvasUtils';
import { savePosterToCloud } from '../services/api';
import SparkleIcon from './SparkleIcon';

export default function PosterCanvas({ userImg, config, generationId, onDownload }) {
  const canvasRef = useRef(null);
  const [templateImg, setTemplateImg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState(null);

  // Load template image whenever config.templateUrl changes
  useEffect(() => {
    if (!config.templateUrl) {
      setTemplateImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous'; // required for canvas export with Cloudinary URLs
    img.onload = () => setTemplateImg(img);
    img.onerror = () => {
      console.warn('Failed to load template image');
      setTemplateImg(null);
    };
    img.src = config.templateUrl;
  }, [config.templateUrl]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawPoster(ctx, { userImg, templateImg, config, canvasW: POSTER_DIMS.w, canvasH: POSTER_DIMS.h });
  }, [userImg, templateImg, config]);

  useEffect(() => {
    render();
  }, [render]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `gemma4-kozhikode-poster.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    if (onDownload) onDownload();
  };

  const handleSaveToCloud = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setSavedUrl(null);
    try {
      const result = await savePosterToCloud(canvas, config.slug || 'gemma4-kozhikode', generationId);
      setSavedUrl(result.url);
    } catch (err) {
      console.error('Cloud save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Poster frame with sparkle corners */}
      <div className="relative group w-full max-w-[480px]">
        {/* Corner sparkles */}
        <div className="absolute -top-3 -left-3 z-10 animate-[sparklePulse_2.5s_ease-in-out_infinite]">
          <SparkleIcon size={22} color="#4285F4" />
        </div>
        <div className="absolute -top-3 -right-3 z-10 animate-[sparklePulse_2.5s_ease-in-out_0.6s_infinite]">
          <SparkleIcon size={18} color="#34A853" />
        </div>
        <div className="absolute -bottom-3 -left-3 z-10 animate-[sparklePulse_2.5s_ease-in-out_1.2s_infinite]">
          <SparkleIcon size={16} color="#EA4335" />
        </div>
        <div className="absolute -bottom-3 -right-3 z-10 animate-[sparklePulse_2.5s_ease-in-out_1.8s_infinite]">
          <SparkleIcon size={20} color="#FBBC04" />
        </div>

        {/* Template badge */}
        {config.templateUrl && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20
                          flex items-center gap-1.5 px-3 py-1 rounded-full
                          bg-[#34A853]/90 backdrop-blur text-white text-[10px] font-bold
                          shadow-lg tracking-wide">
            <SparkleIcon size={10} color="white" />
            CUSTOM TEMPLATE ACTIVE
          </div>
        )}

        {/* Canvas */}
        <div className="canvas-wrapper w-full rounded-2xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={POSTER_DIMS.w}
            height={POSTER_DIMS.h}
            id="poster-canvas"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
                        bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Action buttons row */}
      <div className="flex flex-col gap-3 w-full max-w-[480px]">
        {/* Download button */}
        <button
          id="download-poster-btn"
          onClick={handleDownload}
          className="
            flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold text-white text-sm
            bg-gradient-to-r from-[#4285F4] to-[#34A853]
            hover:from-[#3674e8] hover:to-[#2e9649]
            active:scale-95 transition-all duration-200
            shadow-[0_4px_20px_rgba(66,133,244,0.4)]
            hover:shadow-[0_6px_28px_rgba(66,133,244,0.5)]
            justify-center
          "
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 16L7 11h4V4h2v7h4l-5 5z" fill="white"/>
            <path d="M20 18H4v2h16v-2z" fill="white"/>
          </svg>
          Download Your Poster
          <SparkleIcon size={16} color="white" />
        </button>

        {/* Save to Cloud button */}
        <button
          id="save-to-cloud-btn"
          onClick={handleSaveToCloud}
          disabled={saving}
          className="
            flex items-center gap-2.5 px-8 py-3 rounded-2xl font-semibold text-sm
            border-2 border-[#4285F4]/30 text-[#4285F4] bg-white/80
            hover:border-[#4285F4] hover:bg-[#4285F4]/5
            active:scale-95 transition-all duration-200
            justify-center disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-[#4285F4]/40 border-t-[#4285F4] rounded-full animate-spin" />
              Saving to Cloudinary…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 10a6 6 0 00-12 0 4 4 0 000 8h12a4 4 0 000-8z" stroke="#4285F4" strokeWidth="2"/>
                <path d="M12 12v5M10 15l2 2 2-2" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Save to Cloud
            </>
          )}
        </button>

        {/* Cloud share link */}
        {savedUrl && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#34A853]/8 border border-[#34A853]/20 animate-[fadeIn_0.3s_ease-out]">
            <SparkleIcon size={14} color="#34A853" animate />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#34A853]">Saved to Cloudinary!</p>
              <a
                href={savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#4285F4] underline truncate block"
              >
                {savedUrl}
              </a>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(savedUrl)}
              className="text-xs text-slate-400 hover:text-[#4285F4] transition-colors flex-shrink-0"
              title="Copy link"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 -mt-2">1080 × 1350 px · Perfect for Instagram</p>
    </div>
  );
}
