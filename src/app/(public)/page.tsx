import Link from 'next/link';
import { ArrowRight, Activity, Shield, Users } from 'lucide-react';
// import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function HomePage() {
  return (
    <main className="w-full relative min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="font-serif text-[28px] font-black text-foreground">
          Sho<span className="font-normal italic text-muted-foreground">शा</span>™
        </div>
        <div className="flex items-center gap-3">
          {/* <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-muted-foreground [&>button]:flex [&>button]:h-full [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:p-0">
            <ThemeToggle />
          </div> */}
          <Link href="/dashboard" className="rounded-full bg-foreground px-6 py-2.5 text-[14px] font-bold text-background transition-all hover:bg-foreground/90 hover:scale-105 active:scale-95">
            Launch App
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center pt-40 pb-20 px-6 text-center md:pt-56 md:pb-32">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px]" />
        </div>

        <div className="relative z-10 animate-fadeUp opacity-0" style={{ animationDelay: '0.1s' }}>
          <span className="rounded-full border border-border bg-card px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary shadow-sm">
            Global Reputation Ledger
          </span>
        </div>

        <h1 className="relative z-10 mt-8 max-w-[900px] animate-fadeUp opacity-0 font-serif text-[clamp(48px,8vw,100px)] font-black leading-[0.95] tracking-[-0.04em] text-foreground" style={{ animationDelay: '0.2s' }}>
          your civil impact, <br />
          <span className="text-primary">quantified.</span>
        </h1>

        <p className="relative z-10 mt-8 max-w-[540px] animate-fadeUp opacity-0 text-[16px] leading-[1.6] text-muted-foreground md:text-[18px]" style={{ animationDelay: '0.3s' }}>
          Shosha is a momentum-driven ledger that tracks real-world actions, assigning verifiable impact scores to public figures and changemakers.
        </p>

        <div className="relative z-10 mt-12 flex flex-col gap-4 animate-fadeUp opacity-0 sm:flex-row" style={{ animationDelay: '0.4s' }}>
          <Link href="/dashboard" className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95">
            Explore the Feed <ArrowRight size={18} />
          </Link>
          <Link href="/ranks" className="flex items-center justify-center gap-2 rounded-full border border-border bg-background px-8 py-4 text-[15px] font-bold text-foreground transition-all hover:bg-muted active:scale-95">
            View Global Ranks
          </Link>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="relative z-10 bg-card py-24 px-6 md:px-12 border-y border-border">
        <div className="mx-auto max-w-[1200px] grid gap-12 md:grid-cols-3 md:gap-8">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Activity size={24} />
            </div>
            <h3 className="font-serif text-[24px] font-bold text-foreground">Action Driven</h3>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Every score starts at 1000. It rises with verifiable positive impact and falls with documented harm. Your actions dictate your trajectory.
            </p>
          </div>
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6">
              <Shield size={24} />
            </div>
            <h3 className="font-serif text-[24px] font-bold text-foreground">10X Multipliers</h3>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Impact is contextual. Power, intent, and reach act as multipliers, ensuring that those with greater influence are held to a proportionally higher standard.
            </p>
          </div>
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-6">
              <Users size={24} />
            </div>
            <h3 className="font-serif text-[24px] font-bold text-foreground">Public Ledger</h3>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              A transparent, consistent mirror. Not a court, not a jury. Just a permanent ledger of events and their consequences, visible to the world.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background py-12 px-6 text-center border-t border-border">
        <p className="font-serif text-[20px] font-black text-foreground mb-2">
          Sho<span className="font-normal italic text-muted-foreground">शा</span>
        </p>
        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">
          The system is consistent. Not perfect.
        </p>
      </footer>
    </main>
  );
}
