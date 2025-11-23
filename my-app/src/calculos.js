// src/thermoEngine.js

// Coeficientes Shomate (NIST)
export const GAS_DATA = {
  ar: { nome: "Ar", coeffs: [28.089, -0.0086, 0.000057, -2.7e-8, 0, -9.85, 22.67, 0] },
  n2: { nome: "Nitrogênio (N2)", coeffs: [26.092, 8.2188, -1.976, 0.159, 0.044, -7.96, 220.9, 0] },
  co2: { nome: "CO2", coeffs: [24.99, 55.18, -33.69, 7.94, -0.136, -393.5, 228.2, 0] },
  h2o: { nome: "Vapor d'água", coeffs: [30.09, 6.83, 6.79, -2.53, 0.082, -243.2, 189.3, 0] },
  o2: { nome: "Oxigênio", coeffs: [29.65, 6.137, -1.18, 0.095, -0.219, -9.86, 205.6, 0] }
};

const R = 8.314;

function calcShomate(T, coeffs) {
  let t = T / 1000.0;
  let [A, B, C, D, E, F, G] = coeffs;
  
  let cp = A + B*t + C*Math.pow(t,2) + D*Math.pow(t,3) + E/Math.pow(t,2);
  let h_kj = A*t + (B*Math.pow(t,2))/2 + (C*Math.pow(t,3))/3 + (D*Math.pow(t,4))/4 - E/t + F;
  let s = A*Math.log(t) + B*t + (C*Math.pow(t,2))/2 + (D*Math.pow(t,3))/3 - E/(2*Math.pow(t,2)) + G;
  
  return { cp, h: h_kj * 1000, s, u: (h_kj * 1000) - R * T };
}

function entropiaTotal(T, P, coeffs) {
  let props = calcShomate(T, coeffs);
  return props.s - R * Math.log(P / 100000);
}

function resolverTAdiabatico(S_alvo, V_alvo, n, coeffs, T_chute) {
  let T = T_chute;
  for(let i=0; i<15; i++) {
      let P = (n * R * T) / V_alvo;
      let S_atual = entropiaTotal(T, P, coeffs);
      let diff = S_atual - S_alvo;
      if(Math.abs(diff) < 0.01) break;
      let cp = calcShomate(T, coeffs).cp;
      T = T - (diff * T / cp); 
  }
  return T;
}

export function simularProcesso(params) {
  const { gasKey, processo, T1, P1, V1, V2, modoPreciso } = params;
  const coeffs = GAS_DATA[gasKey].coeffs;
  const n = (P1 * V1) / (R * T1);
  
  let x = [], y = [];
  let steps = 50;
  let deltaV = (V2 - V1) / steps;
  let T2 = T1;
  
  // Setup inicial
  let S1 = entropiaTotal(T1, P1, coeffs);
  let props1 = calcShomate(T1, coeffs);

  if (processo === 'isocorico') {
      // Caso especial: Linha vertical
      let T_final = T1 * 1.5; // Simulação de aquecimento arbitrário p/ visualização
      let P_final = (n * R * T_final) / V1;
      x = [V1, V1];
      y = [P1, P_final];
      T2 = T_final;
      
      let props2 = calcShomate(T2, coeffs);
      let dU = (props2.u - props1.u) * n;
      return { x, y, W: 0, Q: dU, U: dU, T2 };
  }

  let T_prev = T1;
  
  for (let i = 0; i <= steps; i++) {
      let V = V1 + i * deltaV;
      let P = 0;
      let T = T1;

      if (processo === 'isobarico') {
          P = P1;
          T = (P * V) / (n * R);
      } 
      else if (processo === 'isotermico') {
          P = (n * R * T1) / V;
      } 
      else if (processo === 'adiabatico') {
          if (modoPreciso) {
              T = resolverTAdiabatico(S1, V, n, coeffs, T_prev);
          } else {
              T = T1 * Math.pow((V1/V), 0.4); // Gamma 1.4 fixo
          }
          P = (n * R * T) / V;
      }
      
      x.push(V);
      y.push(P);
      T_prev = T;
      if (i === steps) T2 = T;
  }

  // Cálculos Finais de Energia
  let W = 0, Q = 0, U = 0;
  let props2 = calcShomate(T2, coeffs);

  // Delta U é função de estado, calculado sempre igual no modo preciso
  U = (props2.u - props1.u) * n;

  if (processo === 'isotermico') {
      W = n * R * T1 * Math.log(V2/V1);
      if(!modoPreciso) U = 0; 
      Q = W + U;
  } else if (processo === 'isobarico') {
      W = P1 * (V2 - V1);
      Q = (props2.h - props1.h) * n; // Q = Delta H a P cte
  } else if (processo === 'adiabatico') {
      Q = 0;
      W = -U;
  }

  return { x, y, W, Q, U, T2 };
}