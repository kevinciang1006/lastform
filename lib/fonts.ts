import { Archivo, IBM_Plex_Mono, Inter_Tight } from 'next/font/google';

// Archivo carries a width axis; the design sets wdth 110-116 on display type.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const fontVariables = [archivo.variable, interTight.variable, plexMono.variable].join(' ');
