import { useState, useEffect } from 'react';
import { Crosshair, X, AlignCenter, Save } from 'lucide-react';

export default function DevElementResizer() {
  const [active, setActive] = useState(false);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  
  // Slider states
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [padding, setPadding] = useState(0);
  const [margin, setMargin] = useState(0);
  const [isCentered, setIsCentered] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!active || selectedEl) return;

    let hoveredEl: HTMLElement | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#dev-resizer-panel')) return;
      
      if (hoveredEl && hoveredEl !== target) {
        hoveredEl.style.outline = '';
      }
      
      hoveredEl = target;
      target.style.outline = '2px dashed #007AFF';
      target.style.cursor = 'crosshair';
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#dev-resizer-panel')) return;
      target.style.outline = '';
      target.style.cursor = '';
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#dev-resizer-panel')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      target.style.outline = '2px solid #007AFF';
      target.style.cursor = '';
      setSelectedEl(target);
      setSaveStatus('');
      setIsCentered(false);
      
      const rect = target.getBoundingClientRect();
      setWidth(Math.round(rect.width));
      setHeight(Math.round(rect.height));
      
      const comp = window.getComputedStyle(target);
      setPadding(parseInt(comp.padding) || 0);
      setMargin(parseInt(comp.margin) || 0);
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('click', handleClick, { capture: true });

    return () => {
      if (hoveredEl) {
        hoveredEl.style.outline = '';
        hoveredEl.style.cursor = '';
      }
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, [active, selectedEl]);

  // Apply styles when sliders change
  useEffect(() => {
    if (!selectedEl) return;
    
    selectedEl.style.width = width ? `${width}px` : '';
    selectedEl.style.height = height ? `${height}px` : '';
    selectedEl.style.padding = padding ? `${padding}px` : '';
    
    if (isCentered) {
      selectedEl.style.margin = '0 auto';
      if (window.getComputedStyle(selectedEl).display !== 'flex') {
        selectedEl.style.display = 'block';
      }
    } else {
      selectedEl.style.margin = margin ? `${margin}px` : '';
      selectedEl.style.display = '';
    }
  }, [width, height, padding, margin, isCentered, selectedEl]);

  const cancelSelection = () => {
    if (selectedEl) {
      selectedEl.style.outline = '';
      // Cleanup inline styles from our tinkering (optional, but good for reset)
      selectedEl.style.width = '';
      selectedEl.style.height = '';
      selectedEl.style.padding = '';
      selectedEl.style.margin = '';
      selectedEl.style.display = '';
    }
    setSelectedEl(null);
    setActive(false);
  };

  const commitEdits = async () => {
    if (!selectedEl) return;
    try {
      setSaveStatus('Saving...');
      const payload = {
        tag: selectedEl.tagName.toLowerCase(),
        className: typeof selectedEl.className === 'string' ? selectedEl.className : '',
        id: selectedEl.id || '',
        textSnippet: selectedEl.textContent?.slice(0, 50).trim() || '',
        styles: {
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
          padding: padding ? `${padding}px` : undefined,
          margin: isCentered ? '0 auto' : (margin ? `${margin}px` : undefined),
          display: isCentered ? 'block' : undefined
        }
      };

      const res = await fetch('/__save_dev_edits', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSaveStatus('Committed!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('Failed to save');
      }
    } catch (err) {
      setSaveStatus('Error saving');
    }
  };

  return (
    <div id="dev-resizer-panel" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999999 }}>
      {!active && !selectedEl ? (
        <button
          onClick={() => setActive(true)}
          style={{ 
            padding: '12px 16px', borderRadius: 99, background: '#007AFF', color: '#fff', 
            border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <Crosshair size={18} />
          Target Element
        </button>
      ) : active && !selectedEl ? (
        <button
          onClick={() => setActive(false)}
          style={{ 
            padding: '12px 16px', borderRadius: 99, background: '#FF3B30', color: '#fff', 
            border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <X size={18} />
          Cancel Targeting
        </button>
      ) : (
        <div style={{ 
          background: '#222', color: '#fff', padding: 20, borderRadius: 16, width: 320, 
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 15,
          fontFamily: 'sans-serif'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: 14 }}>Adjust Element</span>
            <button onClick={cancelSelection} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
              <X size={16} />
            </button>
          </div>
          
          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setIsCentered(!isCentered)}
              style={{ 
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', 
                background: isCentered ? '#007AFF' : 'rgba(255,255,255,0.1)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 'bold'
              }}
            >
              <AlignCenter size={14} />
              {isCentered ? 'Centered' : 'Center Auto'}
            </button>
            <button 
              onClick={commitEdits}
              style={{ 
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', 
                background: saveStatus === 'Committed!' ? '#34C759' : '#007AFF', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 'bold'
              }}
            >
              <Save size={14} />
              {saveStatus || 'Commit'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Width</span>
                <span style={{ color: '#007AFF' }}>{width}px</span>
              </div>
              <input type="range" min="0" max="2000" value={width} onChange={e => setWidth(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Height</span>
                <span style={{ color: '#007AFF' }}>{height}px</span>
              </div>
              <input type="range" min="0" max="2000" value={height} onChange={e => setHeight(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Padding</span>
                <span style={{ color: '#007AFF' }}>{padding}px</span>
              </div>
              <input type="range" min="0" max="200" value={padding} onChange={e => setPadding(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            
            {!isCentered && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 500 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Margin</span>
                  <span style={{ color: '#007AFF' }}>{margin}px</span>
                </div>
                <input type="range" min="0" max="200" value={margin} onChange={e => setMargin(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
