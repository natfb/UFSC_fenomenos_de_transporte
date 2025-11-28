import React from 'react';

const styles = {
  gaugeBox: { position: 'relative', width: '120px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }
};

// --- ANALOG GAUGE ---
export const AnalogGauge = ({ value, min, max, label, unit, color }) => {
  const pct = (value - min) / (max - min);
  const clamped = Math.min(Math.max(pct, 0), 1);
  const angle = clamped * 180 - 90;

  return (
    <div style={styles.gaugeBox}>
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M 10 50 A 40 40 0 1 1 90 50" fill="none" stroke="#eee" strokeWidth="4" />
        <path d="M 10 50 A 40 40 0 1 1 90 50" fill="none" stroke={color} strokeWidth="4" 
              strokeDasharray={`${clamped * 126} 126`} />
        <circle cx="50" cy="50" r="3" fill="#333" />
        <g transform={`rotate(${angle} 50 50)`} style={{ transition: 'transform 0.1s linear' }}>
          <line x1="50" y1="50" x2="50" y2="15" stroke="red" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
      <div style={{textAlign:'center', lineHeight:'1'}}>
        <span style={{fontSize:'1.1em', fontWeight:'bold', fontFamily:'monospace'}}>{value.toFixed(0)}</span>
        <div style={{fontSize:'0.7em', textTransform:'uppercase', color:'#777'}}>{label} ({unit})</div>
      </div>
    </div>
  );
};

// --- REALISTIC PISTON ---
export const RealPiston = ({ V, T, maxV }) => {
  const maxH = 180; 
  const currentH = (V / maxV) * maxH;
  const pistonY = 200 - currentH;

  const tRatio = Math.min(Math.max((T - 300) / 700, 0), 1);
  const r = Math.floor(52 + (255-52)*tRatio);
  const b = Math.floor(219 + (0-219)*tRatio);
  const gasColor = `rgba(${r}, 100, ${b}, 0.6)`;

  return (
    <div style={{position:'relative', width:'120px', height:'220px', borderBottom:'4px solid #333'}}>
      <svg width="120" height="220" viewBox="0 0 120 220">
        <rect x="10" y="10" width="100" height="200" fill="none" stroke="#333" strokeWidth="4" />
        <rect x="12" y={pistonY} width="96" height={currentH} fill={gasColor} style={{transition:'all 0.1s linear'}} />
        <rect x="12" y={pistonY - 10} width="96" height={10} fill="#555" stroke="#222" style={{transition:'all 0.1s linear'}} />
        <rect x="55" y="0" width="10" height={pistonY - 10} fill="#999" style={{transition:'all 0.1s linear'}} />
        <line x1="110" y1="200" x2="115" y2="200" stroke="black" />
        <line x1="110" y1="20" x2="115" y2="20" stroke="black" />
      </svg>
      <div style={{
          position:'absolute', bottom:'-30px', left:'0', width:'100%', textAlign:'center',
          fontSize:'24px', opacity: tRatio > 0.1 ? 1 : 0.3
      }}>
        {tRatio > 0.5 ? '🔥' : (tRatio < 0.1 ? '❄️' : '💨')}
      </div>
    </div>
  );
};