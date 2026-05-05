import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { Providers } from '@/components/Providers';
import { instrumentSans, playfairDisplay, dmMono } from '@/styles/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shoशा — The Ledger',
  description: 'Every action. Every consequence. Counted.',
  icons: {
    icon: [
      { url: '/icon-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [
      { url: '/icon-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${instrumentSans.variable} ${playfairDisplay.variable} ${dmMono.variable}`}>
      <body className="font-sans text-foreground bg-background antialiased selection:bg-primary selection:text-background">
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
