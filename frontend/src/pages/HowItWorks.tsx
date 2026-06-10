import { cn } from '@/lib/utils';

// ── Small primitives ──────────────────────────────────────────────────────────

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-10">
      <span className="text-[12px] font-bold uppercase tracking-[4px] text-muted-foreground whitespace-nowrap">
        {number} — {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ScoreCard({
  label,
  children,
  meta,
}: {
  label: string;
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-7">
      <p className="text-[12px] font-bold uppercase tracking-[3px] text-muted-foreground mb-4">{label}</p>
      {children}
      <div className="h-px bg-border my-4" />
      {meta && <div className="text-[12px] text-muted-foreground leading-[1.8]">{meta}</div>}
    </div>
  );
}

function QuoteBlock({ quote, attr }: { quote: string; attr: string }) {
  return (
    <div className="border-l border-foreground/30 pl-7 my-8">
      <p className="font-serif text-[20px]  text-foreground leading-snug">{quote}</p>
      <p className="text-[9px] uppercase tracking-[3px] text-muted-foreground mt-3">{attr}</p>
    </div>
  );
}

function Tag({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'red';
}) {
  return (
    <span
      className={cn(
        'inline-block text-[9px] tracking-[1px] border px-2 py-0.5',
        variant === 'default' && 'border-border text-muted-foreground',
        variant === 'green' && 'border-emerald-600/50 text-emerald-600',
        variant === 'red' && 'border-red-500/50 text-red-500',
      )}
    >
      {children}
    </span>
  );
}

function MultiplierItem({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="bg-card p-5">
      <p className="text-[12px] font-bold uppercase tracking-[2px] text-foreground mb-1">{name}</p>
      <p className="text-[12px] text-muted-foreground leading-[1.7]">{desc}</p>
    </div>
  );
}

function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[16px] text-muted-foreground leading-[2]', className)}>{children}</p>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-muted-foreground/50 leading-[1.8] mt-8 pt-6 border-t border-border">
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-background safe-bottom pb-20">
      <div className="mx-auto max-w-[860px] px-7">

        {/* ── HERO ── */}
        <div className="py-20 border-b border-border">
          
          <h1 className="font-serif text-[50px] font-normal text-foreground leading-[1.1] mb-5">
            A number that reflects<br />
            <em className="text-muted-foreground italic">everything you&apos;ve done.</em>
          </h1>
          <p className="text-[20px] text-muted-foreground leading-[2] max-w-[600px]">
            Sho<span className="font-serif italic">शा</span>™ doesn&apos;t judge you. It records what you did, weighs it
            against who you are and what you had, and updates continuously. This page explains how — in plain
            language, without the math.
          </p>
        </div>

        {/* ── 01 THE SHOSHA SCORE ── */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="01" label="The Shosha Score" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-serif text-[30px] font-normal text-foreground leading-[1.3] mb-4">
                One number.<br /><em className="text-muted-foreground">Everything behind it.</em>
              </h2>
              <Prose>
                Your Shosha Score is a single number that reflects the cumulative weight of your actions over time.
                It starts at 1000 — neutral, clean, nothing held against you yet. Every verified event that involves
                you changes it.
              </Prose>
              <Prose className="mt-4">
                A higher score doesn&apos;t mean you&apos;re a good person. A lower score doesn&apos;t mean you&apos;re
                a criminal. It means the ledger has seen more of one than the other, weighed by context it can verify.
              </Prose>

              <QuoteBlock
                quote='"The same action means different things depending on who commits it."'
                attr="— This is the foundation of how we score"
              />

             
            </div>

            <div className="space-y-4">
              <ScoreCard
                label="Starting Score · Every Profile"
                meta={
                  <>
                    Neutral. No events logged.<br />
                    No history. Nothing held.<br /><br />
                    The only direction is yours to decide.
                  </>
                }
              >
                <p className="font-serif text-[52px] font-normal text-foreground leading-none mb-1">1,000</p>
              </ScoreCard>

              <ScoreCard
                label="Score range · No caps"
                meta="There is no ceiling. There is no floor. Behavior is the only boundary."
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="font-serif text-[28px] font-normal text-red-500 leading-none">−∞</p>
                    <p className="text-[9px] uppercase tracking-[2px] text-muted-foreground mt-1">Systemic harm</p>
                  </div>
                  <span className="text-muted-foreground/30 text-[18px] tracking-[4px]">·····</span>
                  <div className="text-right">
                    <p className="font-serif text-[28px] font-normal text-emerald-600 leading-none">+∞</p>
                    <p className="text-[9px] uppercase tracking-[2px] text-muted-foreground mt-1">Sustained good</p>
                  </div>
                </div>
              </ScoreCard>
            </div>
          </div>
        </div>

        {/* ── 02 HOW AN EVENT SCORES ── */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="02" label="How an event changes your score" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-10">
            <div>
              <h2 className="font-serif text-[30px] font-normal text-foreground leading-[1.3] mb-4">
                Every action has<br /><em className="text-muted-foreground">a weight and a context.</em>
              </h2>
              <Prose>
                When an event is reported and verified, the ledger doesn&apos;t just log what happened — it asks who
                did it, what position they held, what they knew, what they had available to them, and what they
                intended.
              </Prose>
              <Prose className="mt-4">
                Ten context factors are applied to every single event. Some amplify the impact. Some reduce it.
                Together they determine how much a specific action by a specific person actually changes their score.
              </Prose>
            </div>
            <div>
              <Prose>
                One report does not create multiple events. If ten people report the same incident, the ledger treats
                it as one event — confirmed. Validation is not amplification.
              </Prose>
              <Prose className="mt-4">
                Events have a 24-hour window. If the same context continues — a protest that spans three days, a
                pattern of behavior in one period — the ledger extends the window accordingly.
              </Prose>
            </div>
          </div>

          {/* Multiplier grid */}
          <p className="text-[12px] font-bold uppercase tracking-[3px] text-muted-foreground mb-4">
            The ten context factors — applied to every event
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border"
            style={{ marginBottom: 0 }}
          >
            {[
              { name: 'Identity', desc: 'Who you are in relation to the action. Constrained individuals score differently than those with inherent advantage.' },
              { name: 'Power', desc: 'Your stature and influence. The greater your authority, the more weight your actions carry — in both directions.' },
              { name: 'Means', desc: 'What resources you had available. Systemic control amplifies. Minimal means reduce.' },
              { name: 'Environment', desc: 'The socioeconomic and geopolitical context you operated in. Extreme constraint is accounted for.' },
              { name: 'Awareness', desc: "What you knew. An expert who harms with full knowledge scores differently than someone who didn't understand the consequences." },
              { name: 'Ability', desc: 'Whether you were physically and cognitively capable of acting differently. Constraint is real. It is also not infinite.' },
              { name: 'Circumstances', desc: 'The pressure you were under at the time. Extreme circumstances reduce weight. Favorable ones do not.' },
              { name: 'Responsibility', desc: 'Whether you were the one who made the decision. Primary authority carries significantly more weight than an executor.' },
              { name: 'Intent', desc: 'What you were trying to do. Accidental harm scores less than deliberate or systemic harm.' },
              { name: 'Repetition Pattern', desc: 'Whether this is a one-time event or part of an established pattern. Repeated behavior compounds.' },
            ].map((m) => (
              <MultiplierItem key={m.name} name={m.name} desc={m.desc} />
            ))}
          </div>

        
        </div>

        {/* ── 03 EXAMPLE ── */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="03" label="A real example, walked through" />

          <div className="mb-8">
            <h2 className="font-serif text-[30px] font-normal text-foreground leading-[1.3] mb-4">
              Two people. Same action.<br /><em className="text-muted-foreground">Very different scores.</em>
            </h2>
            <Prose>
              A worker at a chemical plant notices a safety violation and reports it internally. Nothing happens. He
              reports it publicly two weeks later. Three people are protected from a preventable accident.
            </Prose>
            <Prose className="mt-3">
              His manager — who received the internal report and sat on it — is also on the ledger.
            </Prose>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border mb-8">
            {/* Worker */}
            <div className="bg-card p-7 border-t-2 border-emerald-600">
              <p className="text-[12px] font-bold uppercase tracking-[3px] text-muted-foreground mb-4">The Worker</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <Tag>Low power</Tag>
                <Tag>High awareness</Tag>
                <Tag variant="green">High responsibility</Tag>
                <Tag variant="green">Intent: protective</Tag>
              </div>
              <Prose>
                He had limited authority but full awareness still acted on it despite pressure not to. The ledger
                accounts for that — low power reduces expected impact, but high intent and responsibility in the
                right direction amplify the positive.
              </Prose>
              <div className="flex items-baseline justify-between border-t border-border pt-4 mt-5">
                <span className="text-[9px] uppercase tracking-[2px] text-muted-foreground">Score Change</span>
                <span className="font-serif text-[28px] text-emerald-600">+420</span>
              </div>
            </div>

            {/* Manager */}
            <div className="bg-card p-7 border-t-2 border-red-500">
              <p className="text-[12px] font-bold uppercase tracking-[3px] text-muted-foreground mb-4">The Manager</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <Tag variant="red">High power</Tag>
                <Tag variant="red">High awareness</Tag>
                <Tag variant="red">Primary responsibility</Tag>
                <Tag>Intent: negligent</Tag>
              </div>
              <Prose>
                He had the power to act. He had full awareness. He was the primary decision-maker. He chose
                inaction. Power and responsibility both amplify the negative here — significantly.
              </Prose>
              <div className="flex items-baseline justify-between border-t border-border pt-4 mt-5">
                <span className="text-[9px] uppercase tracking-[2px] text-muted-foreground">Score Change</span>
                <span className="font-serif text-[28px] text-red-500">−3,840</span>
              </div>
            </div>
          </div>

      
        </div>

        {/* ── 04 WEEKLY MOMENTUM ── */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="04" label="Weekly momentum" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-9">
            <div>
              <h2 className="font-serif text-[30px] font-normal text-foreground leading-[1.3] mb-4">
                Every Sunday,<br /><em className="text-muted-foreground">the ledger asks who you&apos;re becoming.</em>
              </h2>
              <Prose>
                Your score isn&apos;t just a total. It has direction. Every week, the system looks at your positive and
                negative events for that week and applies a momentum factor — decay if you&apos;ve been trending
                negative, growth if you&apos;ve been consistently acting well.
              </Prose>
            </div>
            <div>
              <Prose>
                This means that a high score maintained through consistent positive action will continue to grow —
                not just stay flat. And a low score that keeps accumulating negative events will fall faster than the
                events alone would suggest.
              </Prose>
              <Prose className="mt-4">
                Your past matters. It affects your future. This is by design.
              </Prose>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border mb-px">
            {[
              {
                type: 'Growth',
                color: 'text-emerald-600',
                title: 'Positive week',
                desc: 'More good than bad this week. Score grows — and the momentum factor means it grows slightly faster than the raw events alone.',
              },
              {
                type: 'Stable',
                color: 'text-muted-foreground',
                title: 'Balanced week',
                desc: 'Positive and negative roughly cancel out. Score holds. Momentum is neutral. No compounding in either direction.',
              },
              {
                type: 'Decay',
                color: 'text-red-500',
                title: 'Negative week',
                desc: 'More bad than good. Score falls — and the momentum factor accelerates the fall. Repeated negative weeks compound.',
              },
            ].map((item) => (
              <div key={item.type} className="bg-card p-6">
                <p className={cn('text-[9px] font-bold uppercase tracking-[3px] mb-3', item.color)}>
                  {item.type}
                </p>
                <p className="font-serif text-[22px] text-foreground mb-3">{item.title}</p>
                <Prose>{item.desc}</Prose>
              </div>
            ))}
          </div>

          
        </div>

        {/* ── 05 IMPACT SCALE ── */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="05" label="What kinds of actions are on the ledger" />

          <div className="mb-8">
            <h2 className="font-serif text-[30px] font-normal text-foreground leading-[1.3] mb-4">
              From holding a door<br /><em className="text-muted-foreground">to orchestrating a war.</em>
            </h2>
            <Prose>
              The ledger doesn&apos;t distinguish between big and small — it weighs everything. Some actions are worth
              ten points. Some are worth ten thousand. The scale reflects the real-world difference in impact.
            </Prose>
          </div>

          <table className="w-full border-collapse text-[12px]">
            <tbody>
              {[
                { header: 'Everyday' },
                { cat: 'Micro / Daily', act: 'Holding doors, basic courtesy', val: '+10', pos: true },
                { cat: 'Micro / Daily', act: 'Cleaning shared spaces, returning lost items', val: '+20', pos: true },
                { cat: 'Social', act: 'Spreading rumors', val: '−70', pos: false },
                { cat: 'Social', act: 'Harassment or stalking', val: '−100', pos: false },
                { header: 'Community & Professional' },
                { cat: 'Online', act: 'Sharing helpful or educational content', val: '+50', pos: true },
                { cat: 'Health / Safety', act: 'Helping injured people', val: '+300', pos: true },
                { cat: 'Professional', act: 'Creating jobs', val: '+600', pos: true },
                { cat: 'Financial', act: 'Financial manipulation', val: '−100', pos: false },
                { cat: 'Financial', act: 'Tax evasion', val: '−200', pos: false },
                { cat: 'Community', act: 'Destroying public property', val: '−300', pos: false },
                { header: 'Large Scale' },
                { cat: 'Systemic', act: 'Infrastructure development', val: '+500', pos: true },
                { cat: 'Systemic', act: 'Policy improving lives at scale', val: '+500', pos: true },
                { cat: 'Systemic', act: 'Large-scale philanthropy', val: '+800', pos: true },
                { cat: 'Legal', act: 'Murder', val: '−1,000', pos: false },
                { cat: 'Legal', act: 'Organised crime', val: '−1,000', pos: false },
                { header: 'Extreme Impact' },
                { cat: 'Extreme', act: 'City-scale harm or coordinated violence', val: '−5,000', pos: false },
                { cat: 'Extreme', act: 'Nation-scale harm, war-level impact', val: '−8,000', pos: false },
                { cat: 'Extreme', act: 'Genocide, war crimes, systemic mass killing', val: '−10,000', pos: false },
              ].map((row, i) => {
                if ('header' in row) {
                  return (
                    <tr key={i} className="bg-muted/60">
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-[11px] font-bold uppercase tracking-[3px] text-muted-foreground/50"
                      >
                        {row.header}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3 text-[11px] uppercase tracking-[1px] text-muted-foreground w-[200px]">
                      {row.cat}
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.act}</td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-serif text-[16px]',
                        row.pos ? 'text-emerald-600' : 'text-red-500',
                      )}
                    >
                      {row.val}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        
        </div>

        {/* ── 06 CREDIBILITY SCORE ── */}
        <div className="py-16 border-b border-border">
          <SectionLabel number="06" label="The Credibility Score" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-9">
            <div>
              <h2 className="font-serif text-[30px] font-normal text-foreground leading-[1.3] mb-4">
                A separate number.<br /><em className="text-muted-foreground">About you as a participant.</em>
              </h2>
              <Prose>
                The Shosha Score reflects your actions in the world. The Credibility Score reflects how you
                participate on Sho<em>शा</em> itself — how authentic you are, how complete your profile is, how
                trustworthy your submissions have been.
              </Prose>
              <Prose className="mt-4">
                It is not the same thing. A person can have a high Shosha Score and a low Credibility Score — if
                they&apos;ve been gaming the system. Or a low Shosha Score with a high Credibility Score — if
                they&apos;ve been honest and engaged.
              </Prose>
            </div>
            <div>
              <ScoreCard
                label="Credibility Score · What it measures"
                meta={
                  <>
                    High credibility = your submissions carry more weight.<br />
                    Low credibility = your submissions are flagged for additional review.
                  </>
                }
              >
                <ul className="text-[15px] text-muted-foreground leading-[2] list-none">
                  {['Profile completeness', 'Verification status', 'Submission track record', 'Dispute outcomes', 'Community response to your posts'].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </ScoreCard>
            </div>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[3px] text-muted-foreground mb-4">
            Three things that reduce your Credibility Score
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
            {[
              {
                icon: '◎',
                title: 'Fabricated or AI-generated content',
                body: "If a submission you make is pulled down because it contains fabricated information or AI-generated proof, your Credibility Score drops. The ledger only works if what goes into it is real.",
                impact: '↓ Significant reduction',
              },
              {
                icon: '◎',
                title: 'More Opposes than Aligns',
                body: "When the community consistently opposes your submissions — more people disagree with what you've posted than agree — the ledger takes note. Repeated patterns here reduce your credibility as a submitter.",
                impact: '↓ Gradual reduction',
              },
              {
                icon: '◎',
                title: 'Poor dispute handling',
                body: "When events you submitted are successfully disputed — and the dispute is upheld — your Credibility Score reflects that. Submitting without sufficient evidence has a cost.",
                impact: '↓ Moderate reduction',
              },
            ].map((item) => (
              <div key={item.title} className="bg-card p-6">
                <p className="text-[16px] text-muted-foreground mb-2">{item.icon}</p>
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-foreground mb-2">{item.title}</p>
                <Prose>{item.body}</Prose>
                <p className="text-[10px] text-red-500 mt-2">{item.impact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 07 TRANSPARENCY ── */}
        <div className="py-16">
          <SectionLabel number="07" label="What we will and won't tell you" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-serif text-[30px] font-normal text-foreground leading-[1.3] mb-4">
                Controlled transparency<br /><em className="text-muted-foreground">is still transparency.</em>
              </h2>
              <Prose>
                We tell you that ten context factors exist and what they measure. We tell you that events have base
                impact values. We tell you that momentum compounds weekly.
              </Prose>
              <Prose className="mt-4">
                We do not publish the exact weights, thresholds, or internal mappings — because doing so would let
                people game the system. A ledger that can be gamed is not a ledger.
              </Prose>
            </div>
            <div>
              <Prose>
                What Sho<em>शा</em> will never do: manually adjust a score. Take a political position. Assign moral
                truth. The system calculates. You submit evidence. The platform hosts the record.
              </Prose>
              <Prose className="mt-4">
                Every score change is traceable to a specific event. Every event has a source. Every dispute is
                reviewable. The trail is always there.
              </Prose>

              <QuoteBlock
                quote='"Shoशा reflects publicly verifiable actions and their impact over time."'
                attr="— Official position · Not a court. Not a jury. A record."
              />
            </div>
          </div>

          <div className="mt-12 text-center text-[12px] text-muted-foreground/40 tracking-[2px]">
            The system is consistent. Not perfect. &nbsp;·&nbsp; Sho<em>शा</em> V1 &nbsp;·&nbsp; Global Reputation Infrastructure
          </div>
        </div>

      </div>
    </main>
  );
}
