// src/thermoEngine.js

// 1. ATUALIZAÇÃO: Adicionamos 'gamma' e o gás Hélio
export const GAS_DATA = {
  ar: { 
    nome: "Ar Atmosférico", 
    gamma: 1.4, 
    coeffs: [28.089, -0.0086, 0.000057, -2.7e-8, 0, -9.85, 22.67, 0] 
  },
  he: { 
    nome: "Hélio (Monoatômico)",
    gamma: 1.667, // Gamma alto (aquece muito na compressão)
    coeffs: [20.78, 0, 0, 0, 0, -6.197, 126.3, 0]
  },
  n2: { 
    nome: "Nitrogênio (N2)", 
    gamma: 1.4,
    coeffs: [26.092, 8.2188, -1.976, 0.159, 0.044, -7.96, 220.9, 0]
  },
  co2: { 
    nome: "Dióxido de Carbono", 
    gamma: 1.289, 
    coeffs: [24.99, 55.18, -33.69, 7.94, -0.136, -393.5, 228.2, 0]
  },
  h2o: { 
    nome: "Vapor d'água", 
    gamma: 1.33, 
    coeffs: [30.09, 6.83, 6.79, -2.53, 0.082, -243.2, 189.3, 0]
  },
  o2: { 
    nome: "Oxigênio", 
    gamma: 1.4,
    coeffs: [29.65, 6.137, -1.18, 0.095, -0.219, -9.86, 205.6, 0]
  }
};

const R = 8.314;

// --- FUNÇÕES AUXILIARES NIST ---
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
    let P_safe = Math.max(P, 1); 
    return props.s - R * Math.log(P_safe / 100000);
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

// --- SIMULAÇÃO PRINCIPAL ---
export function simularProcesso(params) {
  // 2. ATUALIZAÇÃO: Pegamos overrideT2 dos parametros
  const { gasKey, processo, T1, P1, V1, V2, modoPreciso, overrideT2 } = params;
  
  const gasData = GAS_DATA[gasKey];
  const coeffs = gasData.coeffs;
  const n_mols = (P1 * V1) / (R * T1);

  let x = [], y = [];
  let steps = 100;
  let deltaV = (V2 - V1) / steps;
  let T2 = T1;
  
  let S1 = entropiaTotal(T1, P1, coeffs);
  let W_acumulado = 0;
  let T_prev = T1;
  let P_prev = P1;

  for (let i = 0; i <= steps; i++) {
      let V = V1 + i * deltaV;
      let P = 0;
      let T = T1;

      // 3. ATUALIZAÇÃO: Isocórico agora obedece o input do usuário (overrideT2)
      if (processo === 'isocorico') {
          V = V1; 
          
          // Se o usuário definiu T2 ou P2, usamos esse valor. Se não, T fica fixo.
          let T_target = overrideT2 || T1;
          
          // Interpolação visual
          T = T1 + (T_target - T1) * (i / steps);
          T2 = T;

          P = (n_mols * R * T) / V;
          x.push(V); y.push(P);
          continue;
      }

      if (processo === 'isobarico') {
          P = P1;
          T = (P * V) / (n_mols * R);
      } 
      else if (processo === 'isotermico') {
          T = T1;
          P = (n_mols * R * T) / V;
      } 
      else if (processo === 'adiabatico') {
          if (modoPreciso) {
              T = resolverTAdiabatico(S1, V, n_mols, coeffs, T_prev);
          } else {
              // 4. ATUALIZAÇÃO: Usa o gamma do gás, não valor fixo
              let gamma = gasData.gamma; 
              T = T1 * Math.pow((V1/V), gamma - 1);
          }
          P = (n_mols * R * T) / V;
      }
      
      x.push(V);
      y.push(P);

      if (i > 0 && processo !== 'isocorico') {
          let P_avg = (P + P_prev) / 2;
          let dV_step = V - (V1 + (i-1)*deltaV);
          W_acumulado += P_avg * dV_step;
      }

      T_prev = T;
      P_prev = P;
      if (i === steps) T2 = T;
  }

  // --- CÁLCULOS FINAIS ---
  let W = W_acumulado;
  let Q = 0;
  let U = 0;
  let props2 = calcShomate(T2, coeffs);
  let props1 = calcShomate(T1, coeffs);

  // 5. ATUALIZAÇÃO: Cálculo de U depende do modo
  if (modoPreciso) {
      U = (props2.u - props1.u) * n_mols;
  } else {
      // Física Básica: Cv = R / (gamma - 1)
      let gamma = gasData.gamma;
      let Cv_const = R / (gamma - 1);
      U = n_mols * Cv_const * (T2 - T1);
  }

  if (processo === 'isotermico') {
      U = 0; Q = W;
  } 
  else if (processo === 'isobarico') {
      W = P1 * (V2 - V1);
      if (modoPreciso) {
          Q = (props2.h - props1.h) * n_mols;
      } else {
          // Física Básica: Cp = gamma * R / (gamma - 1)
          let gamma = gasData.gamma;
          let Cp_const = (gamma * R) / (gamma - 1);
          Q = n_mols * Cp_const * (T2 - T1);
      }
  } 
  else if (processo === 'adiabatico') {
      Q = 0;
      W = -U;
  }
  else if (processo === 'isocorico') {
      W = 0;
      // Garante U correto mesmo se o loop não pegou (caso de passo único)
      if(!modoPreciso) {
          let Cv_const = R / (gasData.gamma - 1);
          U = n_mols * Cv_const * (T2 - T1);
      } else {
          U = (props2.u - props1.u) * n_mols;
      }
      Q = U;
  }

  return { x, y, W, Q, U, T2 };
}