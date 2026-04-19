export default function AppleIcon({ size = 16, className = '' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M33.4 27.8c-.1-5.9 4.8-8.8 5-8.9-2.7-4-6.9-4.6-8.5-4.7-3.6-.4-7.1 2.1-8.9 2.1-1.9 0-4.7-2.1-7.8-2.1-4 .1-7.7 2.3-9.9 5.9-4.2 7.3-1.1 18 3.1 23.8 2 2.9 4.4 6 7.5 5.9 3-.1 4.2-1.9 7.9-1.9s4.8 1.9 7.9 1.9c3.2-.1 5.3-2.9 7.2-5.8 2.3-3.4 3.3-6.5 3.3-6.7-.1 0-6.3-2.4-6.4-10.5Z"
      />
      <path
        fill="currentColor"
        d="M27.7 10.4c1.7-2 2.8-4.7 2.5-7.4-2.4.1-5.4 1.7-7.1 3.6-1.5 1.7-2.9 4.6-2.5 7.3 2.7.2 5.5-1.4 7.1-3.5Z"
      />
    </svg>
  )
}