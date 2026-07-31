import "react"

declare module 'react' {
  interface CSSProperties {
    // Allows any custom CSS variable starting with '--' to accept string or number values
    [key: `--${string}`]: string | number;
  }
}
