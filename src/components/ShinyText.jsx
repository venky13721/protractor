// ShinyText — text with a sweeping light sheen
// (inspired by reactbits.dev's Shiny Text).
export default function ShinyText({ children, className = '', speed = 3 }) {
  return (
    <span
      className={`shiny-text ${className}`}
      style={{ animationDuration: `${speed}s` }}
    >
      {children}
    </span>
  )
}
