// src/components/Visuals.jsx
import React, { useEffect, useState } from 'react';

// --- CONTROLES ---
// src/components/Visuals.jsx (Apenas o ControlPanel mudou)
const styles = {
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    fontFamily: 'Segoe UI, sans-serif'
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    color: '#555',
    fontSize: '0.9rem',
    marginTop: '10px'
  },
  input: {
    width: '100%',
    padding: '8px',
    marginTop: '4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box'
  },
  pistonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '300px'
  },
  cylinder: {
    position: 'relative',
    width: '120px',
    height: '250px',
    border: '4px solid #333',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden'
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    color: 'white'
  },
  toggleButton: {
    flex: 1, 
    padding: '8px', 
    border: '1px solid #ccc', 
    borderRadius: '4px', 
    cursor: 'pointer',
    transition: '0.2s'
  }
};

export const ControlPanel = ({ params, setParams, gasOptions }) => {
  // Função auxiliar para lidar com mudanças
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
    }));
  };

  // Alternar entre controlar por V2 ou P2
  const toggleTarget = (mode) => {
    setParams(prev => ({ ...prev, targetMode: mode }));
  };

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
        <option value="adiabatico">Adiabático (Isentrópico)</option>
        <option value="isocorico">Isocórico (V cte)</option>
      </select>

      {/* Inputs Iniciais Fixos */}
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

      {/* SELETOR DE MODO DE CONTROLE (NOVIDADE) */}
      <label style={styles.label}>Definir Estado Final por:</label>
      <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
        <button 
            onClick={() => toggleTarget('V2')}
            style={{
                flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer',
                backgroundColor: params.targetMode === 'V2' ? '#3498db' : '#f9f9f9',
                color: params.targetMode === 'V2' ? 'white' : 'black'
            }}
        >
            Volume (V2)
        </button>
        <button 
            onClick={() => toggleTarget('P2')}
            style={{
                flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer',
                backgroundColor: params.targetMode === 'P2' ? '#3498db' : '#f9f9f9',
                color: params.targetMode === 'P2' ? 'white' : 'black',
                // Desativa P2 se for isobárico (pois P é constante)
                opacity: params.processo === 'isobarico' ? 0.5 : 1,
                pointerEvents: params.processo === 'isobarico' ? 'none' : 'auto'
            }}
        >
            Pressão (P2)
        </button>
      </div>

      {/* Input Dinâmico V2 ou P2 */}
      <div>
          {params.targetMode === 'V2' ? (
              <>
                <label style={styles.label}>Volume Final (V2) [m³]</label>
                <input type="number" name="V2" value={params.V2} step="0.01" onChange={handleChange} style={styles.input}/>
              </>
          ) : (
              <>
                <label style={styles.label}>Pressão Final (P2) [Pa]</label>
                <input type="number" name="P2_target" value={params.P2_target || params.P1} step="1000" onChange={handleChange} style={styles.input}/>
                <small style={{color: '#888'}}>O sistema calculará o V2 necessário.</small>
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

// --- PISTÃO ANIMADO ---
export const Piston = ({ V1, V2, T1, T2 }) => {
  const [height, setHeight] = useState(0);
  const [color, setColor] = useState('rgba(52, 152, 219, 0.6)');

  // Função para interpolar cor baseada na temperatura
  const getTempColor = (T) => {
    const tNorm = Math.min(Math.max((T - 200) / 800, 0), 1); // 200K a 1000K range
    const r = Math.floor(52 + (231 - 52) * tNorm);
    const b = Math.floor(219 + (60 - 219) * tNorm);
    return `rgba(${r}, 100, ${b}, 0.6)`;
  };

  useEffect(() => {
    // Reset para V1
    const maxVol = Math.max(V1, V2) * 1.2;
    const hStart = (V1 / maxVol) * 100;
    const hEnd = (V2 / maxVol) * 100;
    
    setHeight(hStart);
    setColor(getTempColor(T1));

    // Anima para V2
    const timer = setTimeout(() => {
      setHeight(hEnd);
      setColor(getTempColor(T2));
    }, 100);

    return () => clearTimeout(timer);
  }, [V1, V2, T1, T2]);

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md h-full justify-center">
      <h3 className="text-gray-500 text-sm mb-2 font-bold">Visualização Física</h3>
      <div className="relative w-32 h-64 border-4 border-gray-700 border-t-0 rounded-b-lg bg-gray-100 overflow-hidden">
        {/* Gás Colorido */}
        <div 
            className="absolute bottom-0 w-full transition-all duration-1000 ease-in-out"
            style={{ height: `${height}%`, backgroundColor: color }}
        />
        {/* Cabeça do Pistão */}
        <div 
            className="absolute w-full h-4 bg-gray-600 border-b-2 border-black transition-all duration-1000 ease-in-out"
            style={{ bottom: `${height}%` }}
        >
             {/* Haste */}
            <div className="w-4 h-64 bg-gray-400 mx-auto transform -translate-y-full" />
        </div>
      </div>
    </div>
  );
};

// --- PLACAR DE RESULTADOS ---
export const ResultsBoard = ({ results }) => (
  <div className="bg-green-500 text-white p-4 rounded-lg shadow-md w-full">
     <h3 className="font-bold border-b border-green-400 pb-1 mb-2">Resultados (1ª Lei)</h3>
     <div className="grid grid-cols-2 gap-4">
        <div>
            <span className="block text-xs opacity-80">Trabalho (W)</span>
            <span className="text-xl font-mono">{results.W.toFixed(0)} J</span>
        </div>
        <div>
            <span className="block text-xs opacity-80">Calor (Q)</span>
            <span className="text-xl font-mono">{results.Q.toFixed(0)} J</span>
        </div>
        <div>
            <span className="block text-xs opacity-80">Energia Interna (ΔU)</span>
            <span className="text-xl font-mono">{results.U.toFixed(0)} J</span>
        </div>
        <div>
            <span className="block text-xs opacity-80">Temp. Final (T2)</span>
            <span className="text-xl font-mono">{results.T2.toFixed(1)} K</span>
        </div>
     </div>
  </div>
);