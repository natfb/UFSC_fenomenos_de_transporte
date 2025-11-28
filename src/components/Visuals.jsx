import React, { useEffect, useState } from 'react';

const styles = {
  card: {
    backgroundColor: 'white', padding: '20px', borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px',
    fontFamily: 'Segoe UI, sans-serif'
  },
  label: { display: 'block', fontWeight: 'bold', color: '#555', fontSize: '0.9rem', marginTop: '10px' },
  input: { width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
  pistonContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' },
  cylinder: { position: 'relative', width: '120px', height: '250px', border: '4px solid #333', borderTop: 'none', borderRadius: '0 0 10px 10px', backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  resultsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: 'white' },
  btnGroup: { display: 'flex', gap: '5px', marginBottom: '10px' },
  toggleBtn: { flex: 1, padding: '6px', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }
};

export const ControlPanel = ({ params, setParams, gasOptions }) => {
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
    }));
  };

  const setMode = (mode) => {
    setParams(prev => ({ ...prev, targetMode: mode }));
  };

  // Lógica para decidir quais botões aparecem
  const showV = params.processo !== 'isocorico';
  const showP = params.processo !== 'isobarico';
  const showT = params.processo !== 'isotermico';

  return (
    <div style={{...styles.card, flex: 1, minWidth: '300px'}}>
      <h2 style={{marginTop: 0, color: '#333'}}>Configuração</h2>
      
      <label style={styles.label}>Gás</label>
      <select name="gasKey" value={params.gasKey} onChange={handleChange} style={styles.input}>
        {Object.entries(gasOptions).map(([key, val]) => (
          <option key={key} value={key}>{val.nome}</option>
        ))}
      </select>

      <label style={styles.label}>Processo</label>
      <select name="processo" value={params.processo} onChange={handleChange} style={styles.input}>
        <option value="isotermico">Isotérmico (T cte)</option>
        <option value="isobarico">Isobárico (P cte)</option>
        <option value="adiabatico">Adiabático (Q = 0)</option>
        <option value="isocorico">Isocórico (V cte)</option>
      </select>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
          <div>
              <label style={styles.label}>T1 (K)</label>
              <input type="number" name="T1" value={params.T1} onChange={handleChange} style={styles.input}/>
          </div>
          <div>
              <label style={styles.label}>P1 (Pa)</label>
              <input type="number" name="P1" value={params.P1} onChange={handleChange} style={styles.input}/>
          </div>
          <div>
              <label style={styles.label}>V1 (m³)</label>
              <input type="number" name="V1" value={params.V1} step="0.01" onChange={handleChange} style={styles.input}/>
          </div>
      </div>

      <hr style={{margin: '15px 0', border: 'none', borderTop: '1px solid #eee'}}/>

      <label style={styles.label}>Controlar fim do processo por:</label>
      <div style={styles.btnGroup}>
        {showV && (
            <button 
                onClick={() => setMode('V2')}
                style={{...styles.toggleBtn, backgroundColor: params.targetMode === 'V2' ? '#3498db' : '#f9f9f9', color: params.targetMode === 'V2' ? 'white' : 'black'}}
            >
                Volume Final
            </button>
        )}
        {showP && (
            <button 
                onClick={() => setMode('P2')}
                style={{...styles.toggleBtn, backgroundColor: params.targetMode === 'P2' ? '#3498db' : '#f9f9f9', color: params.targetMode === 'P2' ? 'white' : 'black'}}
            >
                Pressão Final
            </button>
        )}
        {showT && (
            <button 
                onClick={() => setMode('T2')}
                style={{...styles.toggleBtn, backgroundColor: params.targetMode === 'T2' ? '#3498db' : '#f9f9f9', color: params.targetMode === 'T2' ? 'white' : 'black'}}
            >
                Temp. Final
            </button>
        )}
      </div>

      {/* Input Dinâmico */}
      <div style={{padding: '10px', background: '#f0f8ff', borderRadius: '5px', border: '1px solid #d6e9f8'}}>
          {params.targetMode === 'V2' && (
              <>
                <label style={{...styles.label, marginTop:0}}>Volume Final (V2) [m³]</label>
                <input type="number" name="V2" value={params.V2} step="0.01" onChange={handleChange} style={styles.input}/>
              </>
          )}
          {params.targetMode === 'P2' && (
              <>
                <label style={{...styles.label, marginTop:0}}>Pressão Final (P2) [Pa]</label>
                <input type="number" name="P2_target" value={params.P2_target || ''} step="1000" placeholder={params.P1} onChange={handleChange} style={styles.input}/>
              </>
          )}
          {params.targetMode === 'T2' && (
              <>
                <label style={{...styles.label, marginTop:0}}>Temperatura Final (T2) [K]</label>
                <input type="number" name="T2_target" value={params.T2_target || ''} step="10" placeholder={params.T1} onChange={handleChange} style={styles.input}/>
              </>
          )}
      </div>

      <div style={{marginTop: '15px', padding: '10px', background: '#eef', borderRadius: '5px', display: 'flex', alignItems: 'center'}}>
        <input type="checkbox" name="modoPreciso" checked={params.modoPreciso} onChange={handleChange} style={{width: '20px', height: '20px', marginRight: '10px'}}/>
        <label style={{margin: 0, fontSize: '0.9rem'}}>Modo NIST (Cp Variável)</label>
      </div>
    </div>
  );
};

export const Piston = ({ V1, V2, T1, T2 }) => {
  const [height, setHeight] = useState(0);
  const [color, setColor] = useState('rgba(52, 152, 219, 0.6)');
  const getTempColor = (T) => {
    const tNorm = Math.min(Math.max((T - 200) / 800, 0), 1);
    const r = Math.floor(52 + (231 - 52) * tNorm);
    const b = Math.floor(219 + (60 - 219) * tNorm);
    return `rgba(${r}, 100, ${b}, 0.6)`;
  };
  useEffect(() => {
    const maxVol = Math.max(V1, V2) * 1.2;
    setHeight((V1 / maxVol) * 100);
    setColor(getTempColor(T1));
    const timer = setTimeout(() => {
      setHeight((V2 / maxVol) * 100);
      setColor(getTempColor(T2));
    }, 100);
    return () => clearTimeout(timer);
  }, [V1, V2, T1, T2]);
  return (
    <div style={{...styles.card, ...styles.pistonContainer}}>
      <h3 style={{margin: '0 0 15px 0', color: '#777'}}>Visualização</h3>
      <div style={styles.cylinder}>
        <div style={{position: 'absolute', bottom: 0, width: '100%', height: `${height}%`, backgroundColor: color, transition: 'all 1s ease-in-out'}} />
        <div style={{position: 'absolute', bottom: `${height}%`, width: '100%', height: '15px', backgroundColor: '#555', borderBottom: '2px solid #222', transition: 'all 1s ease-in-out', zIndex: 2}}>
            <div style={{width: '15px', height: '200px', backgroundColor: '#999', margin: '0 auto', transform: 'translateY(-100%)'}} />
        </div>
      </div>
    </div>
  );
};

export const ResultsBoard = ({ results }) => (
  <div style={{...styles.card, backgroundColor: '#27ae60', color: 'white'}}>
     <h3 style={{borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '5px', marginTop: 0}}>Resultados</h3>
     <div style={styles.resultsGrid}>
        <div><span style={{fontSize:'0.8em', opacity:0.8}}>Trabalho (W)</span><br/><strong style={{fontSize:'1.2em'}}>{results.W.toLocaleString('pt-BR',{maximumFractionDigits:0})} J</strong></div>
        <div><span style={{fontSize:'0.8em', opacity:0.8}}>Calor (Q)</span><br/><strong style={{fontSize:'1.2em'}}>{results.Q.toLocaleString('pt-BR',{maximumFractionDigits:0})} J</strong></div>
        <div><span style={{fontSize:'0.8em', opacity:0.8}}>Energia (ΔU)</span><br/><strong style={{fontSize:'1.2em'}}>{results.U.toLocaleString('pt-BR',{maximumFractionDigits:0})} J</strong></div>
        <div><span style={{fontSize:'0.8em', opacity:0.8}}>Temp. Final (T2)</span><br/><strong style={{fontSize:'1.2em'}}>{results.T2.toFixed(1)} K</strong></div>
     </div>
  </div>
);