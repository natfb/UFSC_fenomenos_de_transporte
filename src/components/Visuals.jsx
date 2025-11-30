import React from 'react';

// Estilos
const styles = {
  card: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '15px', fontFamily: 'Segoe UI' },
  label: { display: 'block', fontWeight: '600', color: '#555', fontSize: '0.85rem', marginTop: '8px' },
  input: { width: '100%', padding: '6px', marginTop: '2px', border: '1px solid #ddd', borderRadius: '4px' },
  btnGroup: { display: 'flex', gap: '5px', marginTop:'5px' },
  toggleBtn: { flex: 1, padding: '5px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' },
  // Estilo para o tooltip (hover)
  tooltipContainer: { position: 'relative', cursor: 'help', borderBottom: '1px dotted #ccc' },
  resRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '6px 0', fontSize:'0.9rem' },
  sectionTitle: { margin: '15px 0 5px 0', fontSize: '0.8rem', color: '#bdc3c7', textTransform: 'uppercase', letterSpacing: '1px' }
};

export const ControlPanel = ({ params, setParams, gasOptions }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : (isNaN(value) ? value : parseFloat(value)) 
    }));
  };
  const setMode = (mode) => setParams(prev => ({ ...prev, targetMode: mode }));

  // Verificações para esconder inputs
  const isRealFluid = ['r22', 'h2o'].includes(params.gasKey);
  const isTConstante = ['isotermico', 'livre', 'ciclo'].includes(params.processo);
  
  return (
    <div style={styles.card}>
      <h3 style={{margin:'0 0 10px 0', color:'#333'}}>Configuração</h3>
      
      <label style={styles.label}>Gás / Fluido</label>
      <select name="gasKey" value={params.gasKey} onChange={handleChange} style={styles.input}>
        {Object.entries(gasOptions).map(([key, val]) => <option key={key} value={key}>{val.nome}</option>)}
      </select>

      <label style={styles.label}>Processo</label>
      <select name="processo" value={params.processo} onChange={handleChange} style={styles.input}>
        <option value="isotermico">Isotérmico (T cte)</option>
        <option value="isobarico">Isobárico (P cte)</option>
        <option value="adiabatico">Adiabático (S cte)</option>
        <option value="isocorico">Isocórico (V cte)</option>
        <option disabled>──────────</option>
        <option value="politropico">Politrópico (PVⁿ = C)</option>
        <option value="livre">Expansão Livre</option>
        <option value="ciclo">Ciclo</option>
      </select>
      
      {params.processo === 'politropico' && (
        <div style={{marginTop:'5px', background:'#fff3cd', padding:'5px', borderRadius:'4px'}}>
           <label style={{...styles.label, marginTop:0}}>Índice (n)</label>
           <input type="number" name="polyN" value={params.polyN || 1.3} step="0.1" onChange={handleChange} style={styles.input}/>
        </div>
      )}

      {/* Inputs Iniciais */}
      <div style={{display:'grid', gridTemplateColumns: isRealFluid ? '1fr 1fr' : '1fr 1fr 1fr', gap:'8px', marginTop:'10px'}}>
        {/* Se for fluido real (CoolProp), escondemos P1 pois é calculado por T e V */}
        {!isRealFluid && (
            <div><label style={styles.label}>P1 (Pa)</label><input type="number" name="P1" value={params.P1} onChange={handleChange} style={styles.input}/></div>
        )}
        
        <div><label style={styles.label}>V1 (m³)</label><input type="number" name="V1" value={params.V1} step="0.001" onChange={handleChange} style={styles.input}/></div>
        <div><label style={styles.label}>T1 (K)</label><input type="number" name="T1" value={params.T1} onChange={handleChange} style={styles.input}/></div>
      </div>

      {/* Input de Massa para Fluidos Reais */}
      {isRealFluid && (
          <div style={{marginTop:'10px', background:'#e8f4fc', padding:'8px', borderRadius:'4px'}}>
              <label style={{...styles.label, marginTop:0, color:'#2980b9'}}>Massa do Sistema (kg)</label>
              <input type="number" name="massa" value={params.massa || 1} step="0.1" onChange={handleChange} style={styles.input}/>
              <small style={{color:'#7f8c8d'}}>Necessário para calcular densidade real.</small>
          </div>
      )}

      <hr style={{margin:'15px 0', borderTop:'1px solid #eee'}}/>
      
      {params.processo !== 'ciclo' && (
        <>
            <label style={styles.label}>Definir Estado Final (2) por:</label>
            <div style={styles.btnGroup}>
                <button onClick={()=>setMode('V2')} style={{...styles.toggleBtn, background: params.targetMode==='V2'?'#3498db':'#f9f9f9', color:params.targetMode==='V2'?'#fff':'#333'}}>Volume</button>
                <button onClick={()=>setMode('P2')} style={{...styles.toggleBtn, background: params.targetMode==='P2'?'#3498db':'#f9f9f9', color:params.targetMode==='P2'?'#fff':'#333'}}>Pressão</button>
                {!isTConstante && (
                <button onClick={()=>setMode('T2')} style={{...styles.toggleBtn, background: params.targetMode==='T2'?'#3498db':'#f9f9f9', color:params.targetMode==='T2'?'#fff':'#333'}}>Temp.</button>
                )}
            </div>

            <div style={{marginTop:'10px', padding:'8px', background:'#f0f8ff', borderRadius:'4px'}}>
                {params.targetMode === 'V2' && <input type="number" name="V2" value={params.V2} onChange={handleChange} style={styles.input} placeholder="Volume Final" />}
                {params.targetMode === 'P2' && <input type="number" name="P2_target" value={params.P2_target} onChange={handleChange} style={styles.input} placeholder="Pressão Final" />}
                {params.targetMode === 'T2' && !isTConstante && <input type="number" name="T2_target" value={params.T2_target} onChange={handleChange} style={styles.input} placeholder="Temp. Final" />}
            </div>
        </>
      )}

      {/* Checkbox Modo Preciso (Aparece apenas para gases ideais, pois reais são sempre precisos) */}
      {!isRealFluid && (
        <div style={{marginTop: '15px', padding: '10px', background: '#eef', borderRadius: '5px', display: 'flex', alignItems: 'center', cursor:'pointer'}}>
            <input type="checkbox" name="modoPreciso" checked={params.modoPreciso} onChange={handleChange} style={{width: '18px', height: '18px', marginRight: '10px', cursor:'pointer'}}/>
            <div>
                <span style={{fontWeight: '600', fontSize: '0.9rem', display:'block', color:'#333'}}>Gás Ideal</span>
                <span style={{fontSize: '0.75rem', color: '#666', display:'block'}}>Marque para usar Cp variável</span>
            </div>
        </div>
      )}
    </div>
  );
};

// Componente de Linha com Tooltip
const ResultRow = ({ label, value, unit, formula, color }) => (
    <div style={styles.resRow} title={formula}>
        <span style={styles.tooltipContainer}>{label} ⓘ</span> 
        <strong style={{color: color || 'inherit'}}>{value} {unit}</strong>
    </div>
);

export const ResultsBoard = ({ results }) => (
  <div style={{...styles.card, backgroundColor:'#2c3e50', color:'#ecf0f1'}}>
    <h3 style={{margin:'0 0 10px 0', borderBottom:'1px solid rgba(255,255,255,0.3)', fontSize:'1rem'}}>Resultados</h3>
    
    <div style={styles.sectionTitle}>Energia (1ª Lei)</div>
    <ResultRow 
        label="Trabalho (W)" 
        value={results.W.toLocaleString(undefined,{maximumFractionDigits:0})} 
        unit="J" 
        color="#e74c3c"
        formula="W = ∫ P dV (Área sob a curva)"
    />
    <ResultRow 
        label="Calor (Q)" 
        value={results.Q.toLocaleString(undefined,{maximumFractionDigits:0})} 
        unit="J" 
        color="#e67e22"
        formula="Q = ΔU + W (Balanço de Energia)"
    />
    <ResultRow 
        label="Energia Int. (ΔU)" 
        value={results.U.toLocaleString(undefined,{maximumFractionDigits:0})} 
        unit="J"
        formula={results.isReal ? "ΔU = m · (u2 - u1)" : "ΔU = n · Cv · ΔT"}
    />

    <div style={styles.sectionTitle}>Propriedades</div>
    <ResultRow 
        label="Entalpia (ΔH)" 
        value={results.H.toLocaleString(undefined,{maximumFractionDigits:0})} 
        unit="J" // Ou % se for título
        formula={results.isReal ? "ΔH = m · (h2 - h1)" : "ΔH = n · Cp · ΔT"}
    />

    <div style={styles.sectionTitle}>Estado Final (2)</div>
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', fontSize:'0.85rem'}}>
        <div>P2: <span style={{color:'#f1c40f'}}>{(results.P2/1000).toFixed(1)} kPa</span></div>
        <div>T2: <span style={{color:'#f1c40f'}}>{results.T2.toFixed(1)} K</span></div>
        <div style={{gridColumn:'span 2'}}>V2: <span style={{color:'#f1c40f'}}>{results.V2.toFixed(4)} m³</span></div>
    </div>
  </div>
);