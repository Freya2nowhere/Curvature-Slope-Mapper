/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  ArrowRightLeft, 
  Info, 
  RefreshCw, 
  Layers, 
  TrendingUp,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';

// --- Helper Functions ---

const sign = (val: number) => (val > 0 ? 1 : val < 0 ? -1 : 0);

/// Curvature Mapping Logic (Y -> Z)
const mapCurvToNDS = (y: number) => {
  const v = (y * -1) / 1000000;
  const absV = Math.abs(v);
  const v_scaled = v * 100000;
  const v_rounded = Math.round(v_scaled * 100000) / 100000;
  const s = Math.sign(v);

  let result = 0;
  if (absV < 0.00064) {
    result = 511 + v_rounded;
  } else if (absV < 0.00192) {
    result = 511 + s * 32 + v_rounded / 2;
  } else if (absV < 0.00448) {
    result = 511 + s * 80 + v_rounded / 4;
  } else if (absV < 0.0096) {
    result = 511 + s * 136 + v_rounded / 8;
  } else if (absV < 0.01984) {
    result = 511 + s * 196 + v_rounded / 16;
  } else if (absV < 0.04032) {
    result = 511 + s * 258 + v_rounded / 32;
  } else if (absV < 0.08128) {
    result = 511 + s * 321 + v_rounded / 64;
  } else if (absV < 0.16192) {
    result = 511 + s * 384 + v_rounded / 128;
  } else {
    result = 511 + s * 511;
  }
  return Math.round(result);
};

// Inverse Curvature Mapping (Z -> Y)
const mapCurvFromNDS = (z: number) => {
  const s = z > 511 ? 1 : z < 511 ? -1 : 0;
  const diff = z - 511;
  const absDiff = Math.abs(diff);

  let v_rounded = 0;
  if (absDiff < 64) {
    v_rounded = diff;
  } else if (absDiff < 128) {
    v_rounded = (diff - s * 32) * 2;
  } else if (absDiff < 192) {
    v_rounded = (diff - s * 80) * 4;
  } else if (absDiff < 256) {
    v_rounded = (diff - s * 136) * 8;
  } else if (absDiff < 320) {
    v_rounded = (diff - s * 196) * 16;
  } else if (absDiff < 384) {
    v_rounded = (diff - s * 258) * 32;
  } else if (absDiff < 448) {
    v_rounded = (diff - s * 321) * 64;
  } else if (absDiff < 511) {
    v_rounded = (diff - s * 384) * 128;
  } else {
    v_rounded = s * 16192; // Approx boundary
  }

  return v_rounded * -10;
};

/// Slope Mapping Logic (N -> L)
const mapSlopeToNDS = (val: number) => {
  const ratio = val / 200;
  const absRatio = Math.abs(ratio);
  const s = sign(ratio);

  let result;
  if (absRatio <= 124) {
    result = Math.abs(ratio);
  } else if (absRatio <= 150) {
    result = 125 * s;
  } else {
    result = 126 * s;
  }
  return Math.round(result);
};

// Inverse Slope Mapping (L -> N)
const mapSlopeFromNDS = (nds: number) => {
  const absNds = Math.abs(nds);
  const s = sign(nds);

  if (absNds <= 124) {
    return nds * 200;
  } else if (absNds === 125) {
    return 137 * 200 * s;
  } else {
    return 151 * 200 * s;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'mapper' | 'visualize'>('mapper');

  // --- Curvature State ---
  const [curvX, setCurvX] = useState<string>('0');
  const [curvY, setCurvY] = useState<string>('0');
  const [curvZA, setCurvZA] = useState<string>('511');
  const [curvZB, setCurvZB] = useState<string>('511');

  // --- Slope State ---
  const [slopeM, setSlopeM] = useState<string>('0');
  const [slopeN, setSlopeN] = useState<string>('0');
  const [slopeLA, setSlopeLA] = useState<string>('0');
  const [slopeLB, setSlopeLB] = useState<string>('0');

  // --- Curvature Updates ---
  const updateCurvFromX = (val: string) => {
    setCurvX(val);
    const x = parseFloat(val);
    if (isNaN(x)) return;
    const y = x;
    const za = mapCurvToNDS(y);
    const zb = mapCurvToNDS(y * -1);
    setCurvY(y.toString());
    setCurvZA(za.toString());
    setCurvZB(zb.toString());
  };

  const updateCurvFromY = (val: string) => {
    setCurvY(val);
    const y = parseFloat(val);
    if (isNaN(y)) return;
    const x = y;
    const za = mapCurvToNDS(y);
    const zb = mapCurvToNDS(y * -1);
    setCurvX(x.toString());
    setCurvZA(za.toString());
    setCurvZB(zb.toString());
  };

  const updateCurvFromZA = (val: string) => {
    setCurvZA(val);
    const za = parseFloat(val);
    if (isNaN(za)) return;
    const y = mapCurvFromNDS(za);
    const x = y;
    const zb = mapCurvToNDS(y * -1);
    setCurvX(x.toString());
    setCurvY(y.toString());
    setCurvZB(zb.toString());
  };

  const updateCurvFromZB = (val: string) => {
    setCurvZB(val);
    const zb = parseFloat(val);
    if (isNaN(zb)) return;
    const y_neg = mapCurvFromNDS(zb);
    const y = y_neg * -1;
    const x = y;
    const za = mapCurvToNDS(y);
    setCurvX(x.toString());
    setCurvY(y.toString());
    setCurvZA(za.toString());
  };

  // --- Slope Updates ---
  const updateSlopeFromM = (val: string) => {
    setSlopeM(val);
    const m = parseFloat(val);
    if (isNaN(m)) return;
    const n = Math.round(Math.tan(m * (Math.PI / 180)) * 10000);
    const la = mapSlopeToNDS(n);
    const lb = la * -1;
    setSlopeN(n.toString());
    setSlopeLA(la.toString());
    setSlopeLB(lb.toString());
  };

  const updateSlopeFromN = (val: string) => {
    setSlopeN(val);
    const n = parseFloat(val);
    if (isNaN(n)) return;
    const m = (Math.atan(n / 10000) * 180) / Math.PI;
    const la = mapSlopeToNDS(n);
    const lb = la * -1;
    setSlopeM(m.toFixed(6));
    setSlopeLA(la.toString());
    setSlopeLB(lb.toString());
  };

  const updateSlopeFromLA = (val: string) => {
    setSlopeLA(val);
    const la = parseFloat(val);
    if (isNaN(la)) return;
    const n = mapSlopeFromNDS(la);
    const m = (Math.atan(n / 10000) * 180) / Math.PI;
    const lb = la * -1;
    setSlopeN(n.toString());
    setSlopeM(m.toFixed(6));
    setSlopeLB(lb.toString());
  };

  const updateSlopeFromLB = (val: string) => {
    setSlopeLB(val);
    const lb = parseFloat(val);
    if (isNaN(lb)) return;
    const la = lb * -1;
    const n = mapSlopeFromNDS(la);
    const m = (Math.atan(n / 10000) * 180) / Math.PI;
    setSlopeN(n.toString());
    setSlopeM(m.toFixed(6));
    setSlopeLA(la.toString());
  };

  // Data for Visualization
  const curvatureChartData = useMemo(() => {
    const data = [];
    // Generate points with higher density near 0
    const points = [
      ...Array.from({ length: 40 }, (_, i) => -200000 + i * 4500),
      ...Array.from({ length: 40 }, (_, i) => -20000 + i * 1000),
      ...Array.from({ length: 40 }, (_, i) => -2000 + i * 100),
      ...Array.from({ length: 40 }, (_, i) => 2000 + i * 1000),
      ...Array.from({ length: 40 }, (_, i) => 20000 + i * 4500),
    ].sort((a, b) => a - b);

    for (const x of points) {
      const y = x; // DHIVE = Original
      const z = mapCurvToNDS(y);
      data.push({ x, z });
    }
    return data;
  }, []);

  const slopeChartData = useMemo(() => {
    const data = [];
    for (let m = -85; m <= 85; m += 2) {
      const n = 10000 * Math.tan((m * Math.PI) / 180);
      const l = mapSlopeToNDS(n);
      data.push({ m, l });
    }
    return data;
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <Calculator size={20} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Curvature & Slope Mapper</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium uppercase tracking-wider">
            <span>v1.0.0</span>
            <div className="h-4 w-px bg-zinc-200" />
            <TrendingUp size={14} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm flex gap-1">
            <button
              onClick={() => setActiveTab('mapper')}
              className={`px-8 py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
                activeTab === 'mapper'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                  : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              <Calculator size={18} />
              Mapper
            </button>
            <button
              onClick={() => setActiveTab('visualize')}
              className={`px-8 py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
                activeTab === 'visualize'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                  : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              <Activity size={18} />
              Visualize
            </button>
          </div>
        </div>

        {activeTab === 'mapper' ? (
          <div className="grid grid-cols-2 gap-8 lg:gap-12">
          
          {/* Curvature Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Layers className="text-emerald-600" size={24} />
              <h2 className="text-2xl font-bold tracking-tight">Curvature Mapping</h2>
            </div>
            
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Original Data X */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    Original Curvature <sup>1</sup>
                  </label>
                  <div className="relative group flex items-center gap-2">
                    <input
                      type="number"
                      value={curvX}
                      onChange={(e) => updateCurvFromX(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all group-hover:border-zinc-300"
                      placeholder="Enter value..."
                    />
                    <button 
                      onClick={() => updateCurvFromX('0')}
                      className="p-3 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Reset to 0"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                {/* DHIVE Curvature Y */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    DHIVE Curvature
                  </label>
                  <div className="relative group flex items-center gap-2">
                    <input
                      type="number"
                      value={curvY}
                      onChange={(e) => updateCurvFromY(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all group-hover:border-zinc-300"
                      placeholder="Enter value..."
                    />
                    <button 
                      onClick={() => updateCurvFromY('0')}
                      className="p-3 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Reset to 0"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                {/* NDS Curvature Options */}
                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      NDS Curvature (Option A) <sup>2</sup>
                    </label>
                    <div className="relative group flex items-center gap-2">
                      <input
                        type="number"
                        value={curvZA}
                        onChange={(e) => updateCurvFromZA(e.target.value)}
                        className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xl font-mono text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="Enter value..."
                      />
                      <button 
                        onClick={() => updateCurvFromZA('511')}
                        className="p-3 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                        title="Reset to 511"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      NDS Curvature (Option B) <sup>3</sup>
                    </label>
                    <div className="relative group flex items-center gap-2">
                      <input
                        type="number"
                        value={curvZB}
                        onChange={(e) => updateCurvFromZB(e.target.value)}
                        className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xl font-mono text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="Enter value..."
                      />
                      <button 
                        onClick={() => updateCurvFromZB('511')}
                        className="p-3 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                        title="Reset to 511"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-zinc-50 border-t border-zinc-100 p-6 space-y-3">
                <div className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-zinc-400 mt-0.5">1:</span>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                    单位为 10⁻⁶/m
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-zinc-400 mt-0.5">2:</span>
                  <p className="text-[9px] text-zinc-500 leading-relaxed font-mono break-all">
                    Z = ROUND(IF(ABS(Y*-1/10^6) &lt; 0.00064, 511 + ROUND(Y*-1/10, 5), IF(ABS(Y*-1/10^6) &lt; 0.00192, 511 + SIGN(Y*-1/10^6)*32 + ROUND(Y*-1/10, 5)/2, IF(ABS(Y*-1/10^6) &lt; 0.00448, 511 + SIGN(Y*-1/10^6)*80 + ROUND(Y*-1/10, 5)/4, IF(ABS(Y*-1/10^6) &lt; 0.0096, 511 + SIGN(Y*-1/10^6)*136 + ROUND(Y*-1/10, 5)/8, IF(ABS(Y*-1/10^6) &lt; 0.01984, 511 + SIGN(Y*-1/10^6)*196 + ROUND(Y*-1/10, 5)/16, IF(ABS(Y*-1/10^6) &lt; 0.04032, 511 + SIGN(Y*-1/10^6)*258 + ROUND(Y*-1/10, 5)/32, IF(ABS(Y*-1/10^6) &lt; 0.08128, 511 + SIGN(Y*-1/10^6)*321 + ROUND(Y*-1/10, 5)/64, IF(ABS(Y*-1/10^6) &lt; 0.16192, 511 + SIGN(Y*-1/10^6)*384 + ROUND(Y*-1/10, 5)/128, 511 + SIGN(Y*-1/10^6)*511)))))))), 0)
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-zinc-400 mt-0.5">3:</span>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    NDS中Link图形化方向和DHive中相反时，曲率需要取相反值后再转换为NDS曲率。
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Slope Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-emerald-600" size={24} />
              <h2 className="text-2xl font-bold tracking-tight">Slope Mapping</h2>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Original Data M */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    Original Slope <sup>1</sup>
                  </label>
                  <div className="relative group flex items-center gap-2">
                    <input
                      type="number"
                      value={slopeM}
                      onChange={(e) => updateSlopeFromM(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all group-hover:border-zinc-300"
                      placeholder="Enter value..."
                    />
                    <button 
                      onClick={() => updateSlopeFromM('0')}
                      className="p-3 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Reset to 0"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                {/* DHIVE Slope N */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    DHIVE Slope
                  </label>
                  <div className="relative group flex items-center gap-2">
                    <input
                      type="number"
                      value={slopeN}
                      onChange={(e) => updateSlopeFromN(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xl font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all group-hover:border-zinc-300"
                      placeholder="Enter value..."
                    />
                    <button 
                      onClick={() => updateSlopeFromN('0')}
                      className="p-3 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Reset to 0"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                {/* NDS Slope Options */}
                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      NDS Slope (Option A) <sup>2</sup>
                    </label>
                    <div className="relative group flex items-center gap-2">
                      <input
                        type="number"
                        value={slopeLA}
                        onChange={(e) => updateSlopeFromLA(e.target.value)}
                        className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xl font-mono text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="Enter value..."
                      />
                      <button 
                        onClick={() => updateSlopeFromLA('0')}
                        className="p-3 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                        title="Reset to 0"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      NDS Slope (Option B) <sup>3</sup>
                    </label>
                    <div className="relative group flex items-center gap-2">
                      <input
                        type="number"
                        value={slopeLB}
                        onChange={(e) => updateSlopeFromLB(e.target.value)}
                        className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xl font-mono text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="Enter value..."
                      />
                      <button 
                        onClick={() => updateSlopeFromLB('0')}
                        className="p-3 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                        title="Reset to 0"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 border-t border-zinc-100 p-6 space-y-3">
                <div className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-zinc-400 mt-0.5">1:</span>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                    单位为 度 (°)
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-zinc-400 mt-0.5">2:</span>
                  <p className="text-[9px] text-zinc-500 leading-relaxed font-mono break-all">
                    L = ROUND(IF(ABS(N/200)≤124, N/200*SIGN(N/200), IF(ABS(N/200)≤150, 125*SIGN(N/200), 126*SIGN(N/200))), 0)
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-zinc-400 mt-0.5">3:</span>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    NDS中Link图形化方向和DHive中相反时，坡度需要取相反值后再转换为NDS坡度。
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
        ) : (
        /* Visualization Section */
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="flex items-center gap-3">
            <Activity className="text-emerald-600" size={24} />
            <h2 className="text-2xl font-bold tracking-tight">Mapping Visualization</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Curvature Chart */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Curvature Mapping Curve</h3>
                <p className="text-xs text-zinc-500">Original Curvature (10⁻⁶/m) vs NDS Curvature (0-1022)</p>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={curvatureChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCurv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="x" 
                      fontSize={10} 
                      tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                      stroke="#94a3b8"
                    />
                    <YAxis fontSize={10} stroke="#94a3b8" domain={[0, 1022]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(val) => `Original: ${val}`}
                      formatter={(val: number) => [`NDS: ${val}`, 'Curvature']}
                    />
                    <ReferenceLine y={511} stroke="#94a3b8" strokeDasharray="3 3" />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="z" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCurv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Slope Chart */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Slope Mapping Curve</h3>
                <p className="text-xs text-zinc-500">Original Slope (°) vs NDS Slope (-126 to 126)</p>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={slopeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSlope" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="m" 
                      fontSize={10} 
                      tickFormatter={(val) => `${val}°`}
                      stroke="#94a3b8"
                    />
                    <YAxis fontSize={10} stroke="#94a3b8" domain={[-130, 130]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(val) => `Original: ${val}°`}
                      formatter={(val: number) => [`NDS: ${val}`, 'Slope']}
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="l" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSlope)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* Footer Info */}
        <footer className="mt-16 pt-8 border-t border-zinc-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900">Technical Mapping Utility</p>
              <p className="text-xs text-zinc-500">Precision conversion for curvature and slope data formats.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  updateCurvFromX('0');
                  updateSlopeFromM('0');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw size={14} />
                Reset All
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
