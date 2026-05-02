import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Brain, 
  AlertTriangle, 
  Tag, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Video, 
  Image as ImageIcon,
  ExternalLink,
  Zap
} from 'lucide-react';
import { AdminReviewControls } from '@/components/admin/AdminReviewControls';
import { BASE_SCORE, profileMultipliersFromWorkbookProfile } from '@/lib/scoring';
import { idSchema } from '@/lib/validators';
import * as accountsRepo from '@/lib/repos/accounts';
import * as reportsRepo from '@/lib/repos/reports';

export const dynamic = 'force-dynamic';

function ConfidenceIndicator({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? 'text-foreground' : pct >= 50 ? 'text-muted-foreground' : 'text-destructive';
  const bgColor = pct >= 75 ? 'bg-muted/40' : pct >= 50 ? 'bg-card' : 'bg-destructive/10';

  return (
    <div className={`flex flex-col items-center rounded-2xl ${bgColor} border border-border p-5`}>
      <span className={`text-5xl font-black font-mono ${color}`}>{pct}%</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">AI Confidence</span>
    </div>
  );
}

export default async function ReviewPage({ params }: { params: { reportId: string } }) {
  const id = idSchema.safeParse(params.reportId);
  if (!id.success) notFound();
  const report = await reportsRepo.findById(id.data);
  if (!report) notFound();
  const account = await accountsRepo.findById(report.accountId);
  const initialMultipliers = account
    ? profileMultipliersFromWorkbookProfile(account, {
        repetitionPattern: Number(report.repetitionPattern ?? 1),
        intent: Number(report.intent ?? 1),
        circumstances: Number(report.circumstances ?? 1),
      })
    : undefined;

  return (
    <div className="space-y-10 safe-bottom">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Link href="/admin/queue" className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-secondary transition-all">
            <ArrowLeft size={14} />
          </div>
          Back to operations queue
        </Link>
        
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
            report.type === 'positive' ? 'bg-muted text-foreground border-border' : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}>
            {report.type} filing
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            {report.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldCheck size={200} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-2xl bg-secondary/50 border border-border overflow-hidden shadow-sm">
                {account?.avatarUrl ? (
                  <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground/20">
                    <ShieldCheck size={32} />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-5xl font-serif font-black text-foreground tracking-tight italic">
                  {account?.displayName ?? 'Case File'}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-muted-foreground/60">{account?.username}</span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{account?.platform}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-background border border-border">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Current Score</p>
                <p className="text-2xl font-mono font-black text-foreground">{account?.score ?? BASE_SCORE}</p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Network Reach</p>
                <p className="text-2xl font-mono font-black text-foreground">{account?.followers ? parseInt(account.followers).toLocaleString() : '—'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border hidden sm:block">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Dossier ID</p>
                <p className="text-[10px] font-mono font-bold text-muted-foreground/40 truncate">{report.accountId}</p>
              </div>
            </div>
          </div>
          
          {account && (
            <Link 
              href={`/account/${account._id}`} 
              className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
            >
              Inspect Dossier
              <ExternalLink size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Evidence & Description */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 mb-8">
              <FileText size={16} className="text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Filing Statement</h3>
            </div>
            <p className="text-xl font-medium text-foreground leading-relaxed italic">
              &ldquo;{report.description}&rdquo;
            </p>
            {report.feelings && (
              <div className="mt-8 rounded-2xl border border-border bg-background p-5 text-sm leading-relaxed text-muted-foreground">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-2">Contextual Feelings</p>
                {report.feelings}
              </div>
            )}
          </div>

          {/* Evidence Gallery */}
          {report.media?.url && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  {report.media.type === 'video' ? <Video size={16} className="text-primary" /> : <ImageIcon size={16} className="text-primary" />}
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Digital Evidence</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-muted-foreground/30">ID: {report.media.url.split('/').pop()?.slice(0, 12)}</span>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl border border-border bg-muted group">
                {report.media.type === 'video' ? (
                  <video src={report.media.url} className="w-full aspect-video object-contain" controls />
                ) : (
                  <img src={report.media.url} alt="Evidence" className="w-full object-contain max-h-[600px] group-hover:scale-[1.02] transition-transform duration-700" />
                )}
                <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center text-muted-foreground">
                  <Zap size={14} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Analysis & Tribunal Actions */}
        <div className="space-y-8">
          {/* AI Analysis Card */}
          {report.aiVerdict && (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
              <div className="absolute -top-10 -right-10 opacity-5 rotate-12">
                <Brain size={180} />
              </div>
              
              <div className="flex items-center gap-3 mb-10">
                <Brain size={16} className="text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">System Analysis</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-10">
                <ConfidenceIndicator value={report.aiVerdict.confidence} />
                <div className="flex flex-col items-center rounded-2xl border border-border bg-background p-5">
                  <span className={`text-5xl font-mono font-black ${
                    report.aiVerdict.proposedImpact > 0 ? 'text-foreground' : report.aiVerdict.proposedImpact < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {report.aiVerdict.proposedImpact > 0 ? '+' : ''}{report.aiVerdict.proposedImpact}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">Proposed Delta</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-background/60 border border-primary/10 text-sm text-foreground/80 leading-relaxed font-medium">
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-3 leading-none">Automated Reasoning</p>
                  {report.aiVerdict.reasoning}
                </div>

                {report.aiVerdict.categoryTags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {report.aiVerdict.categoryTags.map((tag) => (
                      <span key={tag} className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {(report.aiVerdict.abuseFlags?.length ?? 0) > 0 && (
                  <div className="pt-4 border-t border-primary/10">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={12} className="text-destructive" />
                      <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Abuse Markers</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.aiVerdict.abuseFlags.map((flag) => (
                        <span key={flag} className="px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20 text-[10px] font-black text-destructive uppercase tracking-widest">
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tribunal Action Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 mb-10">
              <Zap size={16} className="text-foreground" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tribunal Action</h3>
            </div>
            
            <AdminReviewControls
              reportId={report._id}
              proposedImpact={report.aiVerdict?.proposedImpact ?? 0}
              score={account?.score ?? BASE_SCORE}
              reportType={report.type}
              initialCategory={report.category}
              initialDeed={report.deed}
              initialBaseScore={report.baseScore}
              initialRepetitionPattern={report.repetitionPattern}
              initialIntent={report.intent}
              initialCircumstances={report.circumstances}
              initialMultipliers={initialMultipliers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
