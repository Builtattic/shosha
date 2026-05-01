const fs = require('fs');

const path = 'src/components/admin/AdminReviewControls.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldState = `  const [note, setNote] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState(false);`;

const newState = `  const [note, setNote] = useState('');
  const [repetitionPattern, setRepetitionPattern] = useState('0.5');
  const [intent, setIntent] = useState('0.5');
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState(false);`;

content = content.replace(oldState, newState);

const oldDecide = `        body: JSON.stringify({ verdict, finalImpact: impact, note }),`;
const newDecide = `        body: JSON.stringify({ verdict, finalImpact: impact, note, repetitionPattern, intent }),`;

content = content.replace(oldDecide, newDecide);

const oldJsx = `      {/* Note */}`;
const newJsx = `      {/* Repetition & Intent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Repetition (RP)</label>
          <select 
            value={repetitionPattern} 
            onChange={(e) => setRepetitionPattern(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
          >
            <option value="0.5">No Clear Pattern (0.5)</option>
            <option value="1">Balanced (1)</option>
            <option value="1.5">Mixed Signals (1.5)</option>
            <option value="2">Leaning Off (2)</option>
            <option value="2.5">Pattern Forming (2.5)</option>
            <option value="3">Consistent Pattern (3)</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Intent (IN)</label>
          <select 
            value={intent} 
            onChange={(e) => setIntent(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
          >
            <option value="0.5">Didn't mean to (0.5)</option>
            <option value="1">Not Aware (1)</option>
            <option value="1.5">Not Careful (1.5)</option>
            <option value="2">Meant to (2)</option>
            <option value="2.5">Thought Through (2.5)</option>
            <option value="3">Fully Planned (3)</option>
          </select>
        </div>
      </div>

      {/* Note */}`;

content = content.replace(oldJsx, newJsx);

fs.writeFileSync(path, content, 'utf8');
console.log('AdminReviewControls updated');
