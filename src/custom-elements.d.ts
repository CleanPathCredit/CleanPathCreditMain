// Type declarations for third-party custom HTML elements

declare namespace JSX {
  interface IntrinsicElements {
    "elevenlabs-convai": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { "agent-id": string },
      HTMLElement
    >;
  }
}
