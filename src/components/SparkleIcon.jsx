// SparkleIcon — 4-pointed Gemma sparkle SVG
export default function SparkleIcon({ size = 24, color = '#4285F4', className = '', animate = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${animate ? 'animate-[sparklePulse_2s_ease-in-out_infinite]' : ''} ${className}`}
    >
      {/* 4-pointed star / sparkle */}
      <path
        d="M12 2 C12 2, 13.2 7.5, 14.5 9.5 C16.5 12 22 12 22 12 C22 12 16.5 12 14.5 14.5 C13.2 16.5 12 22 12 22 C12 22 10.8 16.5 9.5 14.5 C7.5 12 2 12 2 12 C2 12 7.5 12 9.5 9.5 C10.8 7.5 12 2 12 2 Z"
        fill={color}
      />
    </svg>
  );
}
