import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { Providers } from '@/components/Providers';
import { instrumentSans, playfairDisplay, dmMono } from '@/styles/fonts';
import './globals.css';

export const metadata: Metadata = {
  // metadataBase tells Next.js the domain to use when resolving
  // relative URLs in OG images and canonical tags
  metadataBase: new URL('https://www.noshosha.com'),
 
  // default title — shown on pages with no generateMetadata
  // template — profile pages render as "Elon Musk — Shosha Score: 847 | Shosha"
  title: {
    default: 'Shosha: The Reputation Ledger',
    template: '%s | Shosha',
  },
 
  description:
    'A permanent, algorithmically calculated reputation score for public figures. Every action verified. Every consequence counted.',
 
  // tells Google to index the site and follow links
  robots: {
    index: true,
    follow: true,
  },
 
  // default OG — shown when a page has no specific OG image
  openGraph: {
    siteName: 'Shosha',
    type: 'website',
    locale: 'en_US',
    images: ['/icon-512.png'], // add a 1200x630 default image to /public
  },
 
  twitter: {
    card: 'summary_large_image',
    site: '@noshosha',    // update to your actual Twitter handle
    creator: '@noshosha',
  },
 
  manifest: '/manifest.json',
 
  icons: {
    icon: '/icon.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${playfairDisplay.variable} ${dmMono.variable}`}
    >
      <body className="font-sans text-foreground bg-background antialiased selection:bg-primary selection:text-background">
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
