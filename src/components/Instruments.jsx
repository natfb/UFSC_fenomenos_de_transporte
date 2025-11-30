import React from 'react';

const styles = {
  gaugeBox: { position: 'relative', width: '120px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }
};

// --- MANÔMETRO / TERMÔMETRO ---
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

// --- PISTÃO REALISTA (Correção: Sem transição CSS para movimento fluido via JS) ---
export const RealPiston = ({ V, T, maxV }) => {
  const svgWidth = 120;
  const svgHeight = 240;
  const cylinderWallThickness = 4;
  const cylinderX = 10;
  const cylinderY = 10;
  const cylinderWidth = 100;
  const cylinderHeight = 200;
  const pistonHeadHeight = 12;
  
  const maxGasPixels = cylinderHeight - pistonHeadHeight;
  
  // Garante que o pistão nunca saia do cilindro visualmente
  const safeV = Math.min(Math.max(V, 0), maxV); 
  const currentGasHeight = (Math.max(safeV, 0.001) / maxV) * maxGasPixels;

  const cylinderBaseY = cylinderY + cylinderHeight;
  const gasTopY = cylinderBaseY - currentGasHeight;
  const pistonHeadTopY = gasTopY - pistonHeadHeight;

  // Cor Dinâmica
  let tNorm = Math.min(Math.max((T - 200) / 600, 0), 1);
  const r = Math.floor(50 + (255 - 50) * tNorm);
  const g = Math.floor(100 * (1 - Math.abs(tNorm - 0.5) * 2));
  const b = Math.floor(255 - (255 - 50) * tNorm);
  const gasColor = `rgba(${r}, ${g}, ${b}, 0.7)`;

  let icon = '🌡️';
  if (tNorm < 0.2) icon = '❄️';
  else if (tNorm > 0.8) icon = '🔥';

  return (
    <div style={{position:'relative', width:`${svgWidth}px`, height:`${svgHeight}px`}}>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        
        {/* Gás (Sem transition para não atrasar a animação) */}
        <rect 
            x={cylinderX + cylinderWallThickness/2} 
            y={gasTopY} 
            width={cylinderWidth - cylinderWallThickness} 
            height={currentGasHeight} 
            fill={gasColor} 
        />

        {/* Paredes */}
        <rect 
            x={cylinderX} y={cylinderY} width={cylinderWidth} height={cylinderHeight} 
            fill="none" stroke="#333" strokeWidth={cylinderWallThickness} 
        />
        <line x1={cylinderX} y1={cylinderBaseY} x2={cylinderX+cylinderWidth} y2={cylinderBaseY} stroke="#333" strokeWidth={cylinderWallThickness}/>

        {/* Cabeça do Pistão */}
        <rect 
            x={cylinderX + cylinderWallThickness/2 + 1} 
            y={pistonHeadTopY} 
            width={cylinderWidth - cylinderWallThickness - 2} 
            height={pistonHeadHeight} 
            fill="#555" stroke="#222" 
        />
        
        {/* Haste */}
        <rect 
            x={svgWidth/2 - 5} y={0} width={10} height={pistonHeadTopY} 
            fill="#999" 
        />
      </svg>
      
      <div style={{
          position:'absolute', bottom:'5px', left:'0', width:'100%', textAlign:'center',
          fontSize:'28px', transition: 'all 0.3s ease'
      }}>
        {icon}
      </div>
    </div>
  );
};