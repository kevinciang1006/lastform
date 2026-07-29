// Keyboard-only escape hatch: invisible until it receives focus, so sighted
// mouse users never see it while the first Tab press always lands here.
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:font-mono focus:text-meta focus:tracking-mono focus:text-chalk"
    >
      Skip to content
    </a>
  );
}
