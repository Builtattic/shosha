'use client';

import { Info, ExternalLink, ShieldCheck, Mail } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background safe-bottom pt-8 px-4 lg:px-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-bold uppercase tracking-wider">
            <Info size={14} /> About Shosha
          </div>
          <h1 className="text-[32px] md:text-[48px] font-serif font-black text-foreground leading-tight">
            The Continuous Reputation Ledger.
          </h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed">
            We are building a mirror that society didn&apos;t ask for. It is an infrastructure layer for tracking, quantifying, and aggregating the real-world impact of public figures and changemakers.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-[20px] font-bold border-b border-border pb-4">Core Principles</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-[16px] font-bold mb-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</div>
                Evidence Over Opinion
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed pl-8">
                Shosha does not care about how someone is perceived in a vacuum. It cares about what can be documented. Every score fluctuation is tied directly to a verifiable event, source, or undertaking.
              </p>
            </div>
            
            <div>
              <h3 className="text-[16px] font-bold mb-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</div>
                Proportional Accountability
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed pl-8">
                A billionaire donating $10,000 does not yield the same impact score as an average citizen doing the same. Our Multiplier Index scales the impact relative to the entity&apos;s Power, Means, and Reputation.
              </p>
            </div>

            <div>
              <h3 className="text-[16px] font-bold mb-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">3</div>
                Path Dependence
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed pl-8">
                The math is relentless. There are no arbitrary resets. Bad actions compound if unchecked. Good actions accelerate if consistent. It reflects the trajectory of character.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-8">
          <h2 className="text-[18px] font-bold mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" /> System Transparency
          </h2>
          <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
            The platform aggregates data, applies multipliers, and executes weekly decay/growth snapshots. You cannot manually edit a score. You cannot buy a score. You can only earn it through verifiable action.
          </p>
          <div className="flex gap-4">
            <button className="flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-[13px] font-bold text-background transition-all hover:bg-foreground/90 active:scale-95">
              Read the Whitepaper <ExternalLink size={14} />
            </button>
            <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-[13px] font-bold text-foreground transition-all hover:bg-muted active:scale-95">
              <Mail size={14} /> Contact Us
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
