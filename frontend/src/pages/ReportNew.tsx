import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, X, Image as ImageIcon, CheckCircle2, AlertTriangle, Info, UploadCloud } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { searchAccounts, getAccount } from '@/api/accounts';
import type { SearchAccount } from '@/mocks/accounts';
import { submitReport } from '@/api/reports';
import { uploadMedia } from '@/api/media';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Community', 'Finance', 'Technology', 'Governance', 
  'Education', 'Healthcare', 'Environment', 'Other'
];

export default function ReportNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  
  // Step 1 State: Account Selection
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = useState<SearchAccount[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SearchAccount | null>(null);

  // Step 2 State: Report Details
  const [type, setType] = useState<'negative'|'positive'>('negative');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  
  // Submit state
  const [submitting, setSubmitting] = useState(false);

  // Auto-select account if provided in query params
  useEffect(() => {
    const aid = searchParams.get('account_id');
    if (!aid || selectedAccount || step !== 1) return;

    let mounted = true;
    (async () => {
      const res = await getAccount(aid);
      if (!mounted) return;
      if (res.ok && res.data) {
        const acc = res.data.account;
        setSelectedAccount({
          _id: acc.id,
          username: acc.handle,
          displayName: acc.display_name ?? acc.handle,
          platform: acc.platform,
        });
        setStep(2);
      }
    })();
    return () => { mounted = false; };
  }, [searchParams, selectedAccount, step]);

  // Handle Search
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }
    
    let mounted = true;
    const search = async () => {
      setSearching(true);
      const res = await searchAccounts(debouncedSearch);
      if (mounted) {
        if (res.ok && res.data) setSearchResults(res.data.items);
        setSearching(false);
      }
    };
    search();
    return () => { mounted = false; };
  }, [debouncedSearch]);

  const handleSubmit = async () => {
    if (!selectedAccount || !title.trim() || !description.trim()) {
      toast.push('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      let mediaData;
      if (mediaFile) {
        const uploadRes = await uploadMedia(mediaFile);
        if (uploadRes.ok && uploadRes.data) {
          mediaData = [uploadRes.data];
        } else {
          throw new Error('Media upload failed');
        }
      }

      const res = await submitReport({
        account_id: selectedAccount._id,
        title,
        description,
        media: mediaData ? mediaData.map(m => ({ ...m, thumbnail_url: m.thumbnail_url ?? undefined })) : undefined,
      });
      
      if (res.ok && res.data) {
        toast.push('Report submitted successfully!');
        navigate(`/reports/${res.data.report._id}`, { replace: true });
      } else {
        throw new Error(res.error || 'Failed');
      }
    } catch {
      toast.push('Failed to submit report');
      setSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground text-center">You must be signed in to file a report.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <h1 className="text-base font-bold">File a Report</h1>
          <div className="w-12 text-right text-xs font-bold text-muted-foreground">
            {step}/3
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="max-w-xl mx-auto mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 md:py-8 space-y-6">
        
        {/* Step 1: Account Selection */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold mb-2">Who are you reporting?</h2>
                <p className="text-sm text-muted-foreground">Find the account or individual you want to log a report against.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or handle..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border/50 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              <div className="space-y-2">
                {searching ? (
                  <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(acc => (
                    <div 
                      key={acc._id} 
                      onClick={() => { setSelectedAccount(acc); setStep(2); }}
                      className="bg-card border border-border/50 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <img src={acc.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${acc.username}`} alt="" className="w-10 h-10 rounded-full" />
                        <div>
                          <div className="font-bold text-sm">{acc.displayName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="bg-muted px-1 rounded uppercase text-[9px]">{acc.platform || 'General'}</span>
                            @{acc.username}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))
                ) : searchQuery.trim() !== '' ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm mb-4">No accounts found.</p>
                    <button className="px-4 py-2 bg-secondary text-sm font-medium rounded-full">
                      Create new dossier
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}

          {/* Step 2: Write Report */}
          {step === 2 && selectedAccount && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Selected Account Card */}
              <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={selectedAccount.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${selectedAccount.username}`} alt="" className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="font-bold text-sm">{selectedAccount.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{selectedAccount.username}</div>
                  </div>
                </div>
                <button onClick={() => setStep(1)} className="p-2 hover:bg-muted rounded-full">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Report Details</h2>
                
                {/* Type Toggle */}
                <div className="flex bg-muted/50 p-1 rounded-xl mb-6">
                  <button 
                    onClick={() => setType('negative')}
                    className={cn("flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all", type === 'negative' ? "bg-background text-destructive shadow-sm" : "text-muted-foreground")}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Concern (Negative)
                  </button>
                  <button 
                    onClick={() => setType('positive')}
                    className={cn("flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all", type === 'positive' ? "bg-background text-emerald-500 shadow-sm" : "text-muted-foreground")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Praise (Positive)
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Headline</label>
                    <input 
                      type="text"
                      maxLength={255}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Short summary of what happened..."
                      className="w-full bg-card border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                    />
                    <div className="text-right text-[10px] text-muted-foreground mt-1">{title.length}/255</div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Detailed Narrative</label>
                    <textarea 
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Provide context, timeline, and facts..."
                      className="w-full bg-card border border-border/50 rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Category</label>
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-card border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm appearance-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Media Upload */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Evidence (Optional)</label>
                    <label className={cn(
                      "flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors",
                      mediaFile ? "border-primary/50 bg-primary/5" : "border-border/50 bg-muted/20 hover:bg-muted/30"
                    )}>
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        className="hidden" 
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setMediaFile(e.target.files[0]);
                          }
                        }}
                      />
                      {mediaFile ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-3" />
                          <div className="text-sm font-medium text-foreground">{mediaFile.name}</div>
                          <p className="text-xs text-muted-foreground mt-1">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <div className="text-sm font-medium">Click to upload evidence</div>
                          <p className="text-xs text-muted-foreground mt-1">Supports Images & Videos up to 50MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={!title.trim() || !description.trim()}
                  onClick={() => setStep(3)}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-50 transition-opacity"
                >
                  Continue to Review
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && selectedAccount && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold mb-4">Review & Submit</h2>
                
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</span>
                    <button onClick={() => setStep(1)} className="text-xs text-primary font-medium">Edit</button>
                  </div>
                  <div className="p-4 flex items-center space-x-3">
                    <img src={selectedAccount.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${selectedAccount.username}`} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-bold text-sm">{selectedAccount.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{selectedAccount.username}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm mt-4">
                  <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Report Details</span>
                    <button onClick={() => setStep(2)} className="text-xs text-primary font-medium">Edit</button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <span className={cn("px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider inline-flex mb-2", 
                        type === 'negative' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'
                      )}>
                        {type === 'negative' ? 'Concern' : 'Praise'} • {category}
                      </span>
                      <h4 className="font-bold text-foreground text-sm">{title}</h4>
                    </div>
                    <div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{description}</p>
                    </div>
                    {mediaFile && (
                      <div className="flex items-center text-xs font-medium text-primary bg-primary/10 w-fit px-3 py-1.5 rounded-lg mt-2">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Evidence Attached: {mediaFile.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start space-x-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By submitting this report, you confirm that the information provided is accurate and factual to the best of your knowledge. False reporting negatively impacts your credibility score.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  disabled={submitting}
                  onClick={() => setStep(2)}
                  className="px-6 py-4 bg-muted text-muted-foreground rounded-2xl font-bold hover:text-foreground transition-colors"
                >
                  Back
                </button>
                <button 
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-50 transition-opacity flex items-center justify-center"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
