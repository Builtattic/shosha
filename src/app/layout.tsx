import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { BottomNav } from '@/components/nav/BottomNav';
import { Providers } from '@/components/Providers';
import { SignInChip } from '@/components/nav/SignInChip';
import { authOptions } from '@/lib/auth';
import { instrumentSerif, jetBrainsMono } from '@/styles/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shosha',
  description: 'Investigative social account reputation dossiers'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${instrumentSerif.variable} ${jetBrainsMono.variable}`}>
      <body>
        <Providers session={session}>
          <div className="mx-auto min-h-screen w-full max-w-md border-x border-border bg-bg safe-bottom">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur">
              <a href="/" className="font-serif text-3xl tracking-normal text-text">
                Shosha
              </a>
              <SignInChip />
            </header>
            {children}
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
