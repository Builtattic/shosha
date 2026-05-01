const fs = require('fs');

const path = 'src/components/report/ReportModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldState = `  const [type, setType] = useState<'positive' | 'negative' | null>(null);`;
const newState = `  const [type, setType] = useState<'positive' | 'negative' | null>(null);
  const [repetitionPattern, setRepetitionPattern] = useState<string>('0.5');
  const [intent, setIntent] = useState<string>('0.5');`;
content = content.replace(oldState, newState);

const oldPayload = `          location: location || undefined,
          tags: taggedPerson ? [taggedPerson] : []
        })
      });`;
const newPayload = `          location: location || undefined,
          tags: taggedPerson ? [taggedPerson] : [],
          repetitionPattern,
          intent
        })
      });`;
content = content.replace(oldPayload, newPayload);

const oldJsx = `          {/* Optional Details */}`;
const newJsx = `          {/* Scoring Options */}
          <section className="space-y-4">
            <div>
              <h3 className="text-[17px] font-bold mb-1">Repetition & Intent</h3>
              <p className="text-[13px] text-muted-foreground">Classify the pattern and intent of this incident.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-bold block mb-2">Repetition Pattern (RP)</label>
                <select 
                  value={repetitionPattern} 
                  onChange={(e) => setRepetitionPattern(e.target.value)}
                  className="w-full rounded-[12px] border border-border bg-card p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <label className="text-[13px] font-bold block mb-2">Intent (IN)</label>
                <select 
                  value={intent} 
                  onChange={(e) => setIntent(e.target.value)}
                  className="w-full rounded-[12px] border border-border bg-card p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          </section>

          {/* Optional Details */}`;
content = content.replace(oldJsx, newJsx);

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete');
