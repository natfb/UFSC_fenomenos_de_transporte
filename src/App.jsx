// src/App.js (Atualizado com lógica inversa)

import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { GAS_DATA, simularProcesso } from './calculos';
import { ControlPanel, Piston, ResultsBoard } from './components/Visuals';

const App = () => {
  const [params, setParams] = useState({
    gasKey: 'ar',
    processo: 'isotermico',
    targetMode: 'V2', // 'V2', 'P2', 'T2'
    T1: 300,
    P1: 100000,
    V1: 0.05,
    V2: 0.10,          // Input de Volume
    P2_target: 50000,  // Input de Pressão
    T2_target: 400,    // Input de Temperatura
    modoPreciso: true
  });

  const [simData, setSimData] = useState(null);

  useEffect(() => {
      let paramsParaSimulacao = { ...params };
      const { P1, V1, T1, P2_target, T2_target, processo, gasKey } = params;
      
      const gamma = GAS_DATA[gasKey].gamma;

      // CORREÇÃO AQUI: Começa assumindo que V2 é o que o usuário digitou no input de Volume.
      // Só mudaremos isso se o modo for P2 ou T2.
      let calculatedV2 = params.V2; 

      // --- MODO: ALVO É PRESSÃO (P2) ---
      if (params.targetMode === 'P2' && P2_target > 0) {
          if (processo === 'isotermico') {
              calculatedV2 = (P1 * V1) / P2_target;
          } 
          else if (processo === 'adiabatico') {
              calculatedV2 = V1 * Math.pow((P1 / P2_target), (1/gamma));
          }
          else if (processo === 'isocorico') {
              calculatedV2 = V1;
              paramsParaSimulacao.overrideT2 = T1 * (P2_target / P1); 
          }
      }

      // --- MODO: ALVO É TEMPERATURA (T2) ---
      else if (params.targetMode === 'T2' && T2_target > 0) {
          if (processo === 'isobarico') {
              // V/T = cte -> V2 = V1 * (T2/T1)
              // Aqui ele calcula o novo volume que gera essa temperatura
              calculatedV2 = V1 * (T2_target / T1);
          }
          else if (processo === 'adiabatico') {
              calculatedV2 = V1 * Math.pow((T1 / T2_target), (1 / (gamma - 1)));
          }
          else if (processo === 'isocorico') {
              calculatedV2 = V1;
              paramsParaSimulacao.overrideT2 = T2_target;
          }
      }

      // Aplica o V2 calculado (ou o original digitado)
      paramsParaSimulacao.V2 = calculatedV2;

      // Resets de segurança para UI
      if (processo === 'isobarico' && params.targetMode === 'P2') setParams(prev=>({...prev, targetMode: 'V2'}));
      if (processo === 'isotermico' && params.targetMode === 'T2') setParams(prev=>({...prev, targetMode: 'V2'}));
      if (processo === 'isocorico' && params.targetMode === 'V2') setParams(prev=>({...prev, targetMode: 'P2'}));

      const resultado = simularProcesso(paramsParaSimulacao);
      setSimData(resultado);

    }, [params]);

  const plotData = useMemo(() => {
    if (!simData) return [];
    return [{
      x: simData.x,
      y: simData.y,
      type: 'scatter',
      mode: 'lines',
      fill: params.processo === 'isocorico' ? 'none' : 'tozeroy',
      line: { width: 3, color: '#3498db' },
      name: 'Processo'
    }];
  }, [simData, params.processo]);

  if (!simData) return <div style={{padding: '20px'}}>Calculando...</div>;

  const layoutStyles = {
    main: { backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    contentRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', width: '100%', maxWidth: '1200px', justifyContent: 'center' },
    rightCol: { flex: 2, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' },
    bottomRow: { display: 'flex', flexWrap: 'wrap', gap: '20px' }
  };

  return (
    <div style={layoutStyles.main}>
      <header style={{textAlign: 'center', marginBottom: '30px'}}>
        <h1 style={{color: '#2c3e50', margin: '0 0 10px 0'}}>Simulador Termodinâmico React</h1>
        <p style={{color: '#7f8c8d', margin: 0}}>NIST / Laine Integration</p>
      </header>
      <div style={layoutStyles.contentRow}>
        <ControlPanel params={params} setParams={setParams} gasOptions={GAS_DATA} />
        <div style={layoutStyles.rightCol}>
          <div style={{backgroundColor: 'white', padding: '10px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <Plot
              data={plotData}
              layout={{
                title: `Diagrama PV - ${params.processo.toUpperCase()}`,
                autosize: true, height: 400, margin: { t: 40, l: 50, r: 20, b: 40 },
                xaxis: { title: 'Volume (m³)' }, yaxis: { title: 'Pressão (Pa)' }
              }}
              useResizeHandler={true} style={{ width: '100%' }}
            />
          </div>
          <div style={layoutStyles.bottomRow}>
            <div style={{flex: 2, minWidth: '250px'}}><ResultsBoard results={simData} /></div>
            <div style={{flex: 1, minWidth: '200px'}}><Piston V1={params.V1} V2={simData.x[simData.x.length-1]} T1={params.T1} T2={simData.T2} /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;