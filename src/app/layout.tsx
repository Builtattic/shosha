import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { Providers } from '@/components/Providers';
import { instrumentSans, playfairDisplay, dmMono } from '@/styles/fonts';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  colorScheme: 'light dark',
};

export const metadata: Metadata = {
  // metadataBase tells Next.js the domain to use when resolving
  // relative URLs in OG images and canonical tags
  metadataBase: new URL('https://www.noshosha.com'),
 
  title: {
    default: 'Shoशा: The Reputation Ledger',
    template: '%s | Shoशा',
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
    siteName: 'Shoशा',
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

  appleWebApp: {
    capable: true,
    title: 'Shoshaa',
    statusBarStyle: 'black-translucent',
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
        {/* App-shell splash — paints with first HTML byte so PWA + APK WebView
            don't show a white flash before React hydrates. Self-removes on
            DOMContentLoaded, with a 2.5s safety timeout. */}
        <div
          id="app-shell-splash"
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            transition: 'opacity 320ms ease',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={88}
            height={88}
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              animation: 'shoshaSplashPulse 1.4s ease-in-out infinite',
            }}
          />
          <style
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes shoshaSplashPulse {
                  0%, 100% { transform: scale(1); opacity: 0.85; }
                  50% { transform: scale(1.06); opacity: 1; }
                }
                #app-shell-splash.shosha-fade { opacity: 0; pointer-events: none; }
              `,
            }}
          />
        </div>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var el = document.getElementById('app-shell-splash');
                if (!el) return;
                var dismiss = function () {
                  el.classList.add('shosha-fade');
                  setTimeout(function () { el && el.parentNode && el.parentNode.removeChild(el); }, 360);
                };
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  setTimeout(dismiss, 220);
                } else {
                  document.addEventListener('DOMContentLoaded', function () { setTimeout(dismiss, 220); }, { once: true });
                }
                setTimeout(dismiss, 2500); // safety net
              })();
            `,
          }}
        />
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
