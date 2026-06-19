import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import SparkleIcon from './SparkleIcon';

export default function PhotoUpload({ onImageReady, bgRemoveEnabled, onBgRemoveToggle, isProcessing }) {
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback((accepted) => {
    const file = accepted[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      onImageReady(file, e.target.result);
    };
    reader.readAsDataURL(file);
  }, [onImageReady]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
  });

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer
          transition-all duration-300 group
          ${isDragActive
            ? 'border-gemma-blue bg-blue-50/40 scale-[1.01]'
            : 'border-slate-200 bg-white/60 hover:border-gemma-blue hover:bg-blue-50/20'
          }
        `}
        id="photo-upload-zone"
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-16 h-16 rounded-xl object-cover ring-2 ring-gemma-blue/30"
              />
              {isProcessing && (
                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-charcoal">Photo added ✓</p>
              <p className="text-xs text-slate-400 mt-0.5">Tap to replace</p>
            </div>
            <div className="ml-auto">
              <SparkleIcon size={20} color="var(--color-gemma-green)" animate />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload icon */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-gemma-blue/10 to-gemma-green/10
                            flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="var(--color-gemma-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 17v1a3 3 0 003 3h12a3 3 0 003-3v-1" stroke="var(--color-gemma-blue)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">
                {isDragActive ? 'Drop it here!' : 'Tap to Upload Photo'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Tap to select from your library · PNG, JPG, WebP</p>
            </div>
          </div>
        )}
      </div>

      {/* Background removal toggle */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 border border-slate-100 shadow-sm">
        <div className="flex-1">
          <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
            <SparkleIcon size={14} color="var(--color-gemma-blue)" />
            Remove Photo Background
          </p>
          <p className="text-xs text-slate-400 mt-0.5">AI-powered · Runs in your browser</p>
        </div>

        {/* Toggle */}
        <button
          id="bg-remove-toggle"
          onClick={() => onBgRemoveToggle(!bgRemoveEnabled)}
          className="relative flex-shrink-0"
          aria-pressed={bgRemoveEnabled}
          aria-label="Toggle background removal"
        >
          <div className={`toggle-track ${bgRemoveEnabled ? 'on' : ''}`}>
            <div className="toggle-thumb" />
          </div>
        </button>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gemma-blue/8 border border-gemma-blue/20">
          <div className="w-4 h-4 border-2 border-gemma-blue border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-gemma-blue font-medium">Removing background with AI… this may take a moment</p>
        </div>
      )}
    </div>
  );
}
