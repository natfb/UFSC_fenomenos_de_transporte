import React, { useState, useEffect, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { GAS_DATA, simularProcesso } from './calculos';
import { ControlPanel, ResultsBoard } from './components/Visuals';
import { RealPiston, AnalogGauge } from './components/Instruments';

const App = () => {
  // --- PROCESS STATE ---
  const [params, setParams] = useState({
    gasKey: 'ar', processo: 'isotermico', targetMode: 'V2',
    T1: 300, P1: 100000, V1: 0.05,
    V2: 0.10, P2_target: 50000, T2_target: 400,
    modoPreciso: true // Default to precise mode
  });

  const [simData, setSimData] = useState(null);
  
  // --- ANIMATION STATE ---
  const [progress, setProgress] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const requestRef = useRef();

  // 1. CALCULATION EFFECT
  useEffect(() => {
    let simParams = { ...params };
    const { P1, V1, T1, P2_target, T2_target, processo, gasKey } = params;
    const gamma = GAS_DATA[gasKey].gamma; // Get gamma for estimations

    // Target conversion logic (uses simple gamma for estimation if needed)
    let calcV2 = params.V2;
    if (params.targetMode === 'P2' && P2_target > 0) {
        if(processo === 'isotermico') 
          calcV2 = (P1*V1)/P2_target;
        else if(processo === 'adiabatico') 
          calcV2 = V1 * Math.pow((P1/P2_target), (1/gamma)); 
        else if(processo === 'isocorico') { 
          calcV2 = V1; simParams.overrideT2 = T1*(P2_target/P1); 
        }
    } else if (params.targetMode === 'T2' && T2_target > 0) {
        if(processo === 'isobarico') calcV2 = V1 * (T2_target/T1);
        else if(processo === 'adiabatico') calcV2 = V1 * Math.pow((T1/T2_target), (1/(gamma-1)));
        else if(processo === 'isocorico') { calcV2 = V1; simParams.overrideT2 = T2_target; }
    }
    simParams.V2 = calcV2;
    
    if (processo==='isobarico' && params.targetMode==='P2') 
      setParams(p=>({...p, targetMode:'V2'}));
    
    const res = simularProcesso(simParams);
    setSimData(res);
    setProgress(100); 
  }, [params]);

  // 2. ANIMATION LOOP
  const animate = () => {
    setProgress(prev => {
        if (prev >= 100) { setIsPlaying(false); return 100; }
        return prev + 1; 
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]);

  // 3. GET CURRENT SNAPSHOT
  const getCurrentState = () => {
    if (!simData || simData.x.length === 0) return { V: params.V1, P: params.P1, T: params.T1 };
    const idx = Math.min(Math.floor((progress / 100) * (simData.x.length - 1)), simData.x.length - 1);
    const V_curr = simData.x[idx];
    const P_curr = simData.y[idx];
    // P = nRT/V -> T = PV/nR
    const n = (params.P1 * params.V1) / (8.314 * params.T1);
    const T_curr = (P_curr * V_curr) / (n * 8.314);
    return { V: V_curr, P: P_curr, T: T_curr };
  };

  const current = getCurrentState();

  // 4. PLOT DATA
  const plotData = useMemo(() => {
    if (!simData) return [];
    return [
        {
            x: simData.x, y: simData.y, type: 'scatter', mode: 'lines',
            fill: params.processo === 'isocorico' ? 'none' : 'tozeroy',
            line: { color: '#ddd', width: 4 }, name: 'Caminho', hoverinfo: 'none'
        },
        {
            x: [current.V], y: [current.P], type: 'scatter', mode: 'markers',
            marker: { color: '#e74c3c', size: 12, border: {color:'white', width:2} },
            name: 'Estado Atual'
        }
    ];
  }, [simData, current]);

  if (!simData) return <div>Calculando...</div>;

  return (
    <div style={{minHeight:'100vh', background:'#f4f7f6', fontFamily:'Segoe UI', padding:'20px', display:'flex', flexDirection:'column', alignItems:'center'}}>
      
      <header style={{textAlign:'center', marginBottom:'20px'}}>
        <h1 style={{color:'#2c3e50', margin:'0'}}>Simulador Termodinâmico Híbrido</h1>
        <p style={{color:'#7f8c8d'}}>Visualização em Tempo Real + Motor NIST/Ideal</p>
      </header>

      <div style={{display:'flex', flexWrap:'wrap', gap:'20px', width:'100%', maxWidth:'1100px', justifyContent:'center'}}>
        
        {/* LEFT: Controls & Results */}
        <div style={{flex:1, minWidth:'300px'}}>
            <ControlPanel params={params} setParams={setParams} gasOptions={GAS_DATA} />
            <ResultsBoard results={simData} />
        </div>

        {/* RIGHT: Graphics & Instruments */}
        <div style={{flex:2, minWidth:'350px', display:'flex', flexDirection:'column', gap:'15px'}}>
            
            {/* Chart */}
            <div style={{background:'white', padding:'10px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>
                <Plot
                    data={plotData}
                    layout={{
                        title: `Diagrama PV (${params.processo}) - ${params.modoPreciso ? 'NIST' : 'Ideal'}`,
                        height: 350, margin: {t:40, l:50, r:20, b:30},
                        xaxis: {title:'Volume (m³)'}, yaxis: {title:'Pressão (Pa)'},
                        showlegend: false
                    }}
                    useResizeHandler={true} style={{width:'100%'}}
                />
                
                {/* Playback Bar */}
                <div style={{padding:'10px 20px', display:'flex', alignItems:'center', gap:'10px', background:'#f9f9f9', borderRadius:'4px', marginTop:'5px'}}>
                    <button 
                        onClick={() => {
                            if(progress >= 100) setProgress(0); 
                            setIsPlaying(!isPlaying);
                        }}
                        style={{background:'#3498db', color:'white', border:'none', padding:'8px 15px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}
                    >
                        {isPlaying ? 'PAUSE' : (progress>=100 ? 'REPLAY' : 'PLAY')}
                    </button>
                    <input 
                        type="range" min="0" max="100" value={progress} 
                        onChange={(e)=>{setIsPlaying(false); setProgress(Number(e.target.value))}}
                        style={{flex:1}}
                    />
                </div>
            </div>

            {/* Instruments Panel */}
            <div style={{display:'flex', gap:'20px', justifyContent:'center', background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>
                
                <RealPiston V={current.V} T={current.T} maxV={Math.max(params.V1, params.V2)*1.2} />
                
                <div style={{display:'flex', flexDirection:'column', justifyContent:'space-around'}}>
                    <AnalogGauge 
                        value={current.P} 
                        min={0} max={Math.max(params.P1, params.P2_target || 0)*1.2} 
                        label="Pressão" unit="Pa" color="#e74c3c" 
                    />
                    <AnalogGauge 
                        value={current.T} 
                        min={0} max={Math.max(params.T1, params.T2_target || 0)*1.2} 
                        label="Temp." unit="K" color="#e67e22" 
                    />
                </div>

            </div>

        </div>
      </div>
    </div>
  );
};

export default App;