// src/App.js (Atualizado com lógica inversa)

import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { GAS_DATA, simularProcesso } from './calculos';
import { ControlPanel, Piston, ResultsBoard } from './components/Visuals';

const App = () => {
  const [params, setParams] = useState({
    gasKey: 'ar',
    processo: 'isotermico',
    targetMode: 'V2', // 'V2' ou 'P2'
    T1: 300,
    P1: 100000,
    V1: 0.05,
    V2: 0.10,         // Volume Alvo
    P2_target: 50000, // Pressão Alvo (se targetMode for P2)
    modoPreciso: true
  });

  const [simData, setSimData] = useState(null);

  useEffect(() => {
    // CLONAR params para não afetar o input visual do usuário
    let paramsParaSimulacao = { ...params };

    // LÓGICA DE INVERSÃO: Se o usuário definiu P2, calculamos V2
    if (params.targetMode === 'P2' && params.processo !== 'isobarico') {
        const { P1, V1, P2_target, processo } = params;
        let calculatedV2 = V1;

        if (processo === 'isotermico') {
            // P1*V1 = P2*V2 -> V2 = P1*V1 / P2
            // Evitar divisão por zero
            if (P2_target > 0) calculatedV2 = (P1 * V1) / P2_target;
        } 
        else if (processo === 'adiabatico') {
            // P1*V1^y = P2*V2^y -> V2 = V1 * (P1/P2)^(1/y)
            // Vamos usar gamma=1.4 aprox para calcular o "limite" do gráfico
            // O motor preciso NIST vai recalcular o caminho exato depois
            const gamma = 1.4; 
            if (P2_target > 0) calculatedV2 = V1 * Math.pow((P1 / P2_target), (1/gamma));
        }
        else if (processo === 'isocorico') {
            // V não muda
            calculatedV2 = V1;
        }

        paramsParaSimulacao.V2 = calculatedV2;
    }

    // Se o usuário mudou para isobárico, força o modo V2 (porque P não muda)
    if (params.processo === 'isobarico' && params.targetMode === 'P2') {
        setParams(prev => ({...prev, targetMode: 'V2'}));
        return;
    }

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
      marker: { color: '#3498db' },
      name: 'Caminho'
    }];
  }, [simData, params.processo]);

  if (!simData) return <div style={{padding: '20px'}}>Carregando...</div>;

  // --- ESTILOS ---
  const layoutStyles = {
    main: {
      backgroundColor: '#f0f2f5',
      minHeight: '100vh',
      fontFamily: 'Segoe UI, sans-serif',
      padding: '20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    contentRow: {
      display: 'flex', flexWrap: 'wrap', gap: '20px', width: '100%', maxWidth: '1200px', justifyContent: 'center'
    },
    rightCol: {
      flex: 2, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px'
    },
    bottomRow: {
        display: 'flex', flexWrap: 'wrap', gap: '20px'
    }
  };

  return (
    <div style={layoutStyles.main}>
      <header style={{textAlign: 'center', marginBottom: '30px'}}>
        <h1 style={{color: '#2c3e50', margin: '0 0 10px 0'}}>Simulador Termodinâmico React</h1>
        <p style={{color: '#7f8c8d', margin: 0}}>Engine NIST / Laine Integration</p>
      </header>

      <div style={layoutStyles.contentRow}>
        <ControlPanel 
          params={params} 
          setParams={setParams} 
          gasOptions={GAS_DATA} 
        />

        <div style={layoutStyles.rightCol}>
          <div style={{backgroundColor: 'white', padding: '10px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <Plot
              data={plotData}
              layout={{
                title: `Diagrama PV - ${params.processo.toUpperCase()}`,
                autosize: true, height: 400,
                margin: { t: 40, l: 50, r: 20, b: 40 },
                xaxis: { title: 'Volume (m³)' },
                yaxis: { title: 'Pressão (Pa)' }
              }}
              useResizeHandler={true}
              style={{ width: '100%' }}
            />
          </div>

          <div style={layoutStyles.bottomRow}>
            <div style={{flex: 2, minWidth: '250px'}}>
                <ResultsBoard results={simData} />
            </div>
            <div style={{flex: 1, minWidth: '200px'}}>
                <Piston V1={params.V1} V2={simData.x[simData.x.length-1]} T1={params.T1} T2={simData.T2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;