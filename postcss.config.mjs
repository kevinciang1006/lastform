// The object form, not the `plugins: ["@tailwindcss/postcss"]` array that
// create-next-app scaffolds. Both work under Next, which resolves plugin-name
// strings itself, but this file is also read by any other tool that searches
// the project root — `pnpm sanity dev` runs the Studio through Vite, which
// vendors postcss-load-config. That loader only calls its resolver for the
// object form: array entries are passed through verbatim, so a bare string
// reaches the plugin type check still a string and throws
// "Invalid PostCSS Plugin found at: plugins[0]".
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
