/** The design's technical-drawing placeholder: 135° hatch with a mono caption. */
export function placeholderSvg(caption: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="hatch" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="18" height="18" fill="#E1E2DC"/>
      <rect width="9" height="18" fill="#D6D7D1"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="#E9E9E4"/>
  <rect x="${width * 0.08}" y="${height * 0.08}" width="${width * 0.84}" height="${height * 0.84}" fill="url(#hatch)"/>
  <text x="${width / 2}" y="${height * 0.88}" text-anchor="middle"
        font-family="IBM Plex Mono, monospace" font-size="${Math.round(width * 0.022)}"
        letter-spacing="${width * 0.0035}" fill="#5A6167">${caption}</text>
</svg>`;
}
