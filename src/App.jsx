import React, { useState, useEffect, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { GAS_DATA, simularProcesso } from './calculos';
import { ControlPanel, ResultsBoard } from './components/Visuals';
import { RealPiston, AnalogGauge } from './components/Instruments';

const App = () => {
  // Estado Inicial
  const [params, setParams] = useState({
    gasKey: 'ar', processo: 'isotermico', targetMode: 'V2',
    T1: 300, P1: 100000, V1: 0.05,
    V2: 0.10, P2_target: 50000, T2_target: 400, polyN: 1.3,
    modoPreciso: false,
    massa: 1.0
  });

  const [simData, setSimData] = useState(null);
  const [progress, setProgress] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const requestRef = useRef();

  // 1. CÁLCULO DA SIMULAÇÃO
  useEffect(() => {
    // --- PREVENÇÃO DE LOOP INFINITO (A CORREÇÃO) ---
    // Só atualizamos o state se ele estiver "errado".
    // Se já estiver certo, não chamamos setParams.
    
    // Regra 1: Isotérmico, Livre e Ciclo não usam controle de Temperatura (T2)
    if (['isotermico', 'livre', 'ciclo'].includes(params.processo) && params.targetMode === 'T2') {
        setParams(p => ({...p, targetMode: 'V2'}));
        return; // Interrompe para esperar o próximo render
    }
    // Regra 2: Isobárico não usa controle de Pressão (P2)
    if (params.processo === 'isobarico' && params.targetMode === 'P2') {
        setParams(p => ({...p, targetMode: 'V2'}));
        return;
    }
    // Regra 3: Ciclo sempre usa Volume como base (não tem alvo único)
    if (params.processo === 'ciclo' && params.targetMode !== 'V2') {
        setParams(p => ({...p, targetMode: 'V2'}));
        return;
    }

    // --- CÁLCULO NORMAL ---
    let simParams = { ...params };
    const { P1, V1, T1, P2_target, T2_target, processo } = params;
    
    let calcV2 = params.V2;
    if (processo !== 'ciclo' && processo !== 'livre') {
        if (params.targetMode === 'P2' && P2_target > 0) {
            if(processo === 'isotermico') calcV2 = (P1*V1)/P2_target;
            else if(processo === 'politropico') calcV2 = V1 * Math.pow((P1/P2_target), (1/(params.polyN||1.3)));
            else if(processo === 'adiabatico') calcV2 = V1 * Math.pow((P1/P2_target), (1/1.4)); 
            else if(processo === 'isocorico') { calcV2 = V1; simParams.overrideT2 = T1*(P2_target/P1); }
        } else if (params.targetMode === 'T2' && T2_target > 0) {
            if(processo === 'isobarico') calcV2 = V1 * (T2_target/T1);
            else if(processo === 'politropico') calcV2 = V1 * Math.pow((T1/T2_target), (1/((params.polyN||1.3)-1)));
            else if(processo === 'adiabatico') calcV2 = V1 * Math.pow((T1/T2_target), (1/0.4));
            else if(processo === 'isocorico') { calcV2 = V1; simParams.overrideT2 = T2_target; }
        }
    }
    simParams.V2 = calcV2;
    
    const res = simularProcesso(simParams);
    setSimData(res);
    
    // Reseta animação ao mudar parâmetros
    setIsPlaying(false);
    setProgress(100); 

  }, [params]); // Dependência: params

  // 2. LOOP DE ANIMAÇÃO (Corrigido)
  const animate = () => {
    setProgress(prev => {
        // Se chegou ao fim, para.
        if (prev >= 100) {
            setIsPlaying(false);
            return 100;
        }
        return prev + 1.5; // Velocidade
    });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
        requestRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]);

  const handlePlay = () => {
      // Se já terminou, volta pro zero e toca
      if (progress >= 100) {
          setProgress(0);
          setIsPlaying(true);
      } else {
          // Se está no meio, pausa ou continua
          setIsPlaying(!isPlaying);
      }
  };

  // 3. ESTADO ATUAL
  const getCurrentState = () => {
    if (!simData || simData.x.length === 0) return { V: params.V1, P: params.P1, T: params.T1 };
    const idx = Math.min(Math.floor((progress / 100) * (simData.x.length - 1)), simData.x.length - 1);
    const V_curr = simData.x[idx];
    const P_curr = simData.y[idx];
    const n = (params.P1 * params.V1) / (8.314 * params.T1);
    const T_curr = (P_curr * V_curr) / (n * 8.314);
    return { V: V_curr, P: P_curr, T: T_curr };
  };

  const current = getCurrentState();

  // 4. GRÁFICO
  const plotData = useMemo(() => {
    if (!simData) return [];
    let fillType = 'tozeroy';
    let dashStyle = 'solid';
    let lineColor = '#3498db';

    if (params.processo === 'isocorico' || params.processo === 'livre') fillType = 'none';
    if (params.processo === 'ciclo') fillType = 'toself';
    if (params.processo === 'livre') { dashStyle = 'dot'; lineColor = '#95a5a6'; }

    return [
        {
            x: simData.x, y: simData.y, type: 'scatter', mode: 'lines',
            fill: fillType,
            line: { color: lineColor, width: 3, dash: dashStyle }, 
            name: 'Processo'
        },
        {
            x: [current.V], y: [current.P], type: 'scatter', mode: 'markers',
            marker: { color: '#e74c3c', size: 12, border: {color:'white', width:2} },
            name: 'Estado Atual'
        }
    ];
  }, [simData, current, params.processo]);

  if (!simData) return <div>Carregando...</div>;

  // Escalas
  let maxP_scale = Math.max(...simData.y, params.P1) * 1.1;
  let maxT_scale = Math.max(params.T1, simData.T2, 600) * 1.1; 
  let maxV_scale = Math.max(...simData.x, params.V1) * 1.2;

  return (
    <div style={{minHeight:'100vh', background:'#ecf0f1', fontFamily:'Segoe UI', padding:'20px', display:'flex', flexDirection:'column', alignItems:'center'}}>
      
      <header style={{textAlign:'center', marginBottom:'20px'}}>
        <h1 style={{color:'#2c3e50', margin:'0', fontSize:'1.8rem'}}>Simulador Termodinâmico</h1>
        <p style={{color:'#7f8c8d', margin:'0'}}>subtitulo sla</p>
      </header>

      <div style={{display:'flex', flexWrap:'wrap', gap:'15px', width:'100%', maxWidth:'1000px', justifyContent:'center', alignItems:'flex-start'}}>
        
        <div style={{flex:1, minWidth:'280px', maxWidth:'350px'}}>
            <ControlPanel params={params} setParams={setParams} gasOptions={GAS_DATA} />
            <ResultsBoard results={simData} />
        </div>

        <div style={{flex:2, minWidth:'350px', display:'flex', flexDirection:'column', gap:'15px'}}>
            <div style={{background:'white', padding:'10px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>
                <Plot
                    data={plotData}
                    layout={{
                        title: { text: `Diagrama PV`, font:{size:14}},
                        height: 300, margin: {t:30, l:50, r:20, b:30},
                        xaxis: {title:'Volume (m³)', showgrid:true}, 
                        yaxis: {title:'Pressão (Pa)', showgrid:true},
                        showlegend: false, hovermode: 'closest',
                        dragmode: 'pan'
                    }}
                    config={{
                      displayModeBar: true, 
                      scrollZoom: true, 
                      responsive: true, 
                      modeBarButtonsToProps: {
                        pan2d: { active: false }, 
                        zoom2d: { active: true }
                      },
                      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'resetScale2d'],
                    }} 
                    style={{width:'100%'}}
                />
                
                <div style={{padding:'8px', display:'flex', alignItems:'center', gap:'10px', background:'#f5f6fa', borderRadius:'4px', marginTop:'5px', border:'1px solid #eee'}}>
                    <button 
                        onClick={handlePlay}
                        style={{background: isPlaying ? '#e74c3c' : '#3498db', color:'white', border:'none', padding:'6px 15px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontSize:'0.8rem', minWidth:'70px'}}
                    >
                        {isPlaying ? 'PAUSE' : (progress>=100 ? 'REPLAY' : 'PLAY')}
                    </button>
                    <input 
                        type="range" min="0" max="100" value={progress} 
                        onChange={(e)=>{setIsPlaying(false); setProgress(Number(e.target.value))}}
                        style={{flex:1, cursor:'grab'}}
                    />
                </div>
            </div>

            <div style={{display:'flex', gap:'15px', justifyContent:'center', alignItems:'center', background:'white', padding:'15px 10px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>
                <div style={{transform:'scale(0.9)'}}>
                   <RealPiston V={current.V} T={current.T} maxV={maxV_scale} />
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <AnalogGauge value={current.P} min={0} max={maxP_scale} label="Pressão" unit="Pa" color="#c0392b" />
                    <AnalogGauge value={current.T} min={0} max={maxT_scale} label="Temp." unit="K" color="#d35400" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;