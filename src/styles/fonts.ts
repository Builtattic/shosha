import { Instrument_Sans, Playfair_Display, DM_Mono } from 'next/font/google';

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument-sans'
});

export const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '700', '900'],
  variable: '--font-playfair-display'
});

export const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono'
});
