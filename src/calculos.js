// src/thermoEngine.js

// --- BANCO DE DADOS ---
export const GAS_DATA = {
  ar: { 
    nome: "Ar Atmosférico", 
    gamma: 1.4, 
    coeffs: [28.089, -0.0086, 0.000057, -2.7e-8, 0, -9.85, 22.67, 0] 
  },
  he: { 
    nome: "Hélio (Monoatômico)",
    gamma: 1.667,
    coeffs: [20.786, 4.85e-10, -1.58e-10, 1.52e-11, 3.19e-11, -6.197, 126.3, 0]
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
  },
  // Fluidos Reais (Usam CoolProp)
  r22: { 
    nome: "R22 (Real - CoolProp)", 
    type: "real", 
    code: "R22", // Nome interno do CoolProp
    massa: 2.28626 // Fixa para o exercício (kg)
  },
  h2o: { 
    nome: "Água (Real - CoolProp)", 
    type: "real", 
    code: "Water",
    massa: 5.0 // Fixa para o exercício (kg)
  }
};

const R = 8.314;

// =================================================================
// ENGINE 1: INTERNAL MATH (Fast, for Ideal Gases)
// =================================================================

function calcShomate(T, coeffs) {
  let t = T / 1000.0;
  let [A, B, C, D, E, F, G] = coeffs;
  let cp = A + B*t + C*Math.pow(t,2) + D*Math.pow(t,3) + E/Math.pow(t,2);
  let h = (A*t + (B*Math.pow(t,2))/2 + (C*Math.pow(t,3))/3 + (D*Math.pow(t,4))/4 - E/t + F) * 1000;
  let s0 = A*Math.log(t) + B*t + (C*Math.pow(t,2))/2 + (D*Math.pow(t,3))/3 - E/(2*Math.pow(t,2)) + G;
  let u = h - R * T;
  return { cp, h, s0, u };
}

function entropiaTotal(T, P, coeffs) {
    let { s0 } = calcShomate(T, coeffs);
    let P_safe = Math.max(P, 1); 
    return s0 - R * Math.log(P_safe / 100000);
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

function simularIdeal(params) {
  const { gasKey, processo, T1, P1, V1, V2, overrideT2, polyN, modoPreciso } = params;
  const gasData = GAS_DATA[gasKey];
  const coeffs = gasData.coeffs;
  const n_mols = (P1 * V1) / (R * T1);

  let x = [], y = [], steps = 100, deltaV = (V2 - V1) / steps;
  let T2 = T1, W_acumulado = 0, T_prev = T1, P_prev = P1;
  let S1 = entropiaTotal(T1, P1, coeffs);

  if (processo === 'ciclo') {
      let P_low = P1 * 0.6;
      let W_liq = (P1 - P_low) * (V2 - V1);
      return { x: [V1, V2, V2, V1, V1], y: [P1, P1, P_low, P_low, P1], W: W_liq, Q: W_liq, U: 0, H: 0, S: 0, T2: T1 };
  }

  for (let i = 0; i <= steps; i++) {
      let V = V1 + i * deltaV, P = 0, T = T1;

      if (processo === 'livre') { T = T1; P = (n_mols * R * T) / V; }
      else if (processo === 'politropico') {
         let n_idx = polyN !== undefined ? polyN : 1.3;
         P = P1 * Math.pow((V1/V), n_idx); T = (P * V) / (n_mols * R);
      }
      else if (processo === 'isocorico') {
          V = V1;
          let T_target = overrideT2 || T1;
          T = T1 + (T_target - T1) * (i / steps);
          P = (n_mols * R * T) / V;
          x.push(V); y.push(P); T2 = T; continue;
      }
      else if (processo === 'isobarico') { P = P1; T = (P * V) / (n_mols * R); } 
      else if (processo === 'isotermico') { T = T1; P = (n_mols * R * T) / V; } 
      else if (processo === 'adiabatico') {
          if (modoPreciso) T = resolverTAdiabatico(S1, V, n_mols, coeffs, T_prev);
          else T = T1 * Math.pow((V1/V), gasData.gamma - 1);
          P = (n_mols * R * T) / V;
      }
      
      x.push(V); y.push(P);
      if (i > 0 && processo !== 'isocorico' && processo !== 'livre') {
          let P_avg = (P + P_prev) / 2;
          W_acumulado += P_avg * (V - (V1 + (i-1)*deltaV));
      }
      T_prev = T; P_prev = P; if (i === steps) T2 = T;
  }

  let props1 = calcShomate(T1, coeffs);
  let props2 = calcShomate(T2, coeffs);
  let S2 = entropiaTotal(T2, y[steps], coeffs); 
  
  let dU = 0, dH = 0;
  if (modoPreciso) { dU = (props2.u - props1.u) * n_mols; dH = (props2.h - props1.h) * n_mols; }
  else { 
      let Cv = R / (gasData.gamma - 1); dU = n_mols * Cv * (T2 - T1);
      let Cp = (gasData.gamma * R) / (gasData.gamma - 1); dH = n_mols * Cp * (T2 - T1);
  }
  let dS = (S2 - S1) * n_mols;
  let Q = 0;

  if (processo === 'isotermico') { dU = 0; Q = W_acumulado; }
  else if (processo === 'isobarico') { Q = dH; if(!modoPreciso) dU = Q - W_acumulado; }
  else if (processo === 'adiabatico') { Q = 0; W_acumulado = -dU; if(modoPreciso) dS = 0; }
  else if (processo === 'isocorico') { W_acumulado = 0; Q = dU; }
  else if (processo === 'politropico') { Q = dU + W_acumulado; }

  return { 
        x, y, 
        W: W_acumulado, Q, U: dU, H: dH, S: dS, T2,
        P2: y[y.length-1], // <--- ADICIONAR
        V2: x[x.length-1], // <--- ADICIONAR
        isReal: false
    };
}


// =================================================================
// ENGINE 2: COOLPROP (LOCAL WASM)
// =================================================================

function simularReal(params) {
    // Verifica carregamento
    if (typeof window.Module === 'undefined' || typeof window.Module.PropsSI === 'undefined') {
        console.warn("CoolProp (Module) not ready.");
        return { x:[params.V1, params.V2], y:[params.P1, params.P1], W:0, Q:0, U:0, H:0, S:0, T2:0 };
    }

    const { gasKey, processo, T1, V1, targetMode, T2_target } = params;
    const gasData = GAS_DATA[gasKey];
    const Fluid = gasData.code;
    const m = gasData.massa || 1.0; 

    // Estado 1 (Inicial)
    const D1 = m / V1;
    
    // --- CORREÇÃO DO V2 (O GRANDE CONSERTO) ---
    // O App.js manda um V2 baseado em gás ideal. Aqui nós corrigimos para o Real.
    let V2_real = params.V2; // Padrão

    // Se o usuário definiu uma Temperatura Alvo (T2), calculamos o V2 real para ela.
    if (targetMode === 'T2' && T2_target) {
        try {
            let P_calc = params.P1;
            // Se for isocórico, V não muda. Se for outros, calculamos.
            if (processo === 'isobarico') {
                // Isobárico: P é constante. Qual a densidade em T2?
                let D2_real = window.Module.PropsSI('D', 'T', T2_target, 'P', P_calc, Fluid);
                V2_real = m / D2_real;
            }
            else if (processo === 'adiabatico') {
                // Adiabático: S é constante.
                let S1 = window.Module.PropsSI('S', 'T', T1, 'D', D1, Fluid);
                let D2_real = window.Module.PropsSI('D', 'T', T2_target, 'S', S1, Fluid);
                V2_real = m / D2_real;
            }
        } catch(e) {
            console.warn("Erro ao recalcular V2 real:", e);
        }
    }
    // ------------------------------------------

    // Propriedades Iniciais
    let u1 = 0, h1 = 0, s1 = 0;
    try {
        u1 = window.Module.PropsSI('U', 'T', T1, 'D', D1, Fluid);
        h1 = window.Module.PropsSI('H', 'T', T1, 'D', D1, Fluid);
        s1 = window.Module.PropsSI('S', 'T', T1, 'D', D1, Fluid);
    } catch(e) { return { x:[], y:[], W:0, Q:0, U:0, H:0, S:0, T2:0 }; }
    
    let x_vals = [], y_vals = [];
    let steps = 100;
    let W_acc = 0;
    let T_atual = T1;
    let P_prev = params.P1; // Começa com P1

    for (let i = 0; i <= steps; i++) {
        // Usa o V2_real corrigido para o passo
        let V = V1 + (V2_real - V1) * (i/steps);
        let D = m / V;
        let P = 0;

        try {
            if (processo === 'isocorico') {
                V = V1; D = D1;
                let T_tgt = params.overrideT2 || T2_target || (T1 + 10);
                T_atual = T1 + (T_tgt - T1)*(i/steps);
                P = window.Module.PropsSI('P', 'T', T_atual, 'D', D, Fluid);
                x_vals.push(V); y_vals.push(P);
                continue; 
            }
            else if (processo === 'isotermico') {
                T_atual = T1;
                P = window.Module.PropsSI('P', 'T', T1, 'D', D, Fluid);
            }
            else if (processo === 'isobarico') {
                // Forçamos P constante visualmente para evitar ruído numérico do CoolProp
                P = params.P1;
                // Calculamos T baseada no volume atual
                T_atual = window.Module.PropsSI('T', 'P', P, 'D', D, Fluid);
            }
            else if (processo === 'adiabatico') {
                P = window.Module.PropsSI('P', 'S', s1, 'D', D, Fluid);
                T_atual = window.Module.PropsSI('T', 'S', s1, 'D', D, Fluid);
            }
        } catch (e) {
            P = P_prev; 
        }

        x_vals.push(V);
        y_vals.push(P);

        if (i > 0) {
            let P_avg = (P + P_prev) / 2;
            W_acc += P_avg * (V - x_vals[i-1]); 
        }
        P_prev = P;
    }

    // Estado Final Preciso
    let V_final = x_vals[steps];
    let D2 = m / V_final;
    let u2=0, h2=0, s2=0, titulo=-1;
    
    try {
        // Recalcula propriedades finais exatas baseadas no último ponto
        // Nota: Para isobárico, usaremos T_atual do último loop
        u2 = window.Module.PropsSI('U', 'T', T_atual, 'D', D2, Fluid);
        h2 = window.Module.PropsSI('H', 'T', T_atual, 'D', D2, Fluid);
        s2 = window.Module.PropsSI('S', 'T', T_atual, 'D', D2, Fluid);
        titulo = window.Module.PropsSI('Q', 'T', T_atual, 'D', D2, Fluid);
    } catch(e) {}

    let dU = (u2 - u1) * m;
    let dH = (h2 - h1) * m;
    let dS = (s2 - s1) * m;
    
    // Para isobárico, Q = dH é mais preciso que dU + W devido a erro de integração
    let Q = (processo === 'isobarico') ? dH : (dU + W_acc);

    return { 
        x: x_vals, 
        y: y_vals, 
        W: Math.abs(W_acc), 
        Q: Math.abs(Q), 
        U: Math.abs(dU), 
        H: (titulo >= 0 && titulo <= 1) ? titulo * 100 : dH, 
        S: dS, 
        T2: T_atual,
        P2: y_vals[y_vals.length-1], // <--- ADICIONAR
        V2: x_vals[x_vals.length-1], // <--- ADICIONAR
        isReal: true // Flag pro tooltip
    };
}


// --- MAIN ROUTER ---
export function simularProcesso(params) {
  const { gasKey } = params;
  const gasInfo = GAS_DATA[gasKey];

  if (gasInfo.type === 'real') {
      return simularReal(params);
  } else {
      return simularIdeal(params);
  }
}