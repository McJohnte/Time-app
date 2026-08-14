export const Tick = ({ size = 10, color = '#0c0824', w = 3.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

export const Chevron = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const Cross = ({ size = 11, w = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

export const Stop = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="2.5" />
  </svg>
)

export const Play = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 4.5l13 7.5-13 7.5z" />
  </svg>
)

export const Plus = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Logo = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="tieLogoGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#150088" />
        <stop offset="0.25" stopColor="#4500ff" />
        <stop offset="0.5" stopColor="#9300ff" />
        <stop offset="0.75" stopColor="#b300ff" />
        <stop offset="1" stopColor="#ffaf00" />
      </linearGradient>
    </defs>
    <path
      d="M8.2 1.6h7.6a3 3 0 0 1 2.6 1.5l3.8 6.6a3 3 0 0 1 0 3l-3.8 6.6a3 3 0 0 1-2.6 1.5H8.2a3 3 0 0 1-2.6-1.5L1.8 12.7a3 3 0 0 1 0-3l3.8-6.6a3 3 0 0 1 2.6-1.5z"
      stroke="url(#tieLogoGrad)"
      strokeWidth="1.7"
    />
  </svg>
)
