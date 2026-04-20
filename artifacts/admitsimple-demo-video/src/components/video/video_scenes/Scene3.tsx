import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

const extractedFields = [
  { label: "Name", value: "Marcus Thompson", color: "#5BC8DC" },
  { label: "DOB", value: "March 14, 1988 (36)", color: "#5BC8DC" },
  { label: "Insurance", value: "BCBS PPO — Group #44821", color: "#22C55E" },
  { label: "Auth Status", value: "30 days residential approved", color: "#22C55E" },
  { label: "Primary Dx", value: "F11.20 — Opioid Use Disorder", color: "#F97316" },
  { label: "Detox Needed", value: "Yes — medically supervised", color: "#F97316" },
  { label: "Referral Source", value: "Phoenix General Hospital", color: "#8B5CF6" },
  { label: "Last Treatment", value: "Relo Recovery, 2022 (18 mo)", color: "#8B5CF6" },
];

const docLines = [
  { w: "70%", dark: false },
  { w: "55%", dark: true },
  { w: "80%", dark: false },
  { w: "45%", dark: true },
  { w: "90%", dark: false },
  { w: "65%", dark: false },
  { w: "50%", dark: true },
  { w: "75%", dark: false },
  { w: "40%", dark: true },
  { w: "85%", dark: false },
  { w: "60%", dark: true },
  { w: "70%", dark: false },
  { w: "55%", dark: false },
  { w: "80%", dark: true },
  { w: "45%", dark: false },
  { w: "90%", dark: false },
  { w: "65%", dark: true },
  { w: "50%", dark: false },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);
  const [visibleFields, setVisibleFields] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (phase < 3) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleFields(i);
      if (i >= extractedFields.length) clearInterval(interval);
    }, 280);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center gap-8 px-16" {...sceneTransitions.splitHorizontal}>
      <motion.div className="absolute top-1/4 left-[10%] w-64 h-64 bg-[#5BC8DC]/8 rounded-full blur-[80px]"
        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Left: Document panel */}
      <div className="w-[38%] z-10">
        <motion.div
          className="relative bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          style={{ aspectRatio: '3/4' }}
          initial={{ opacity: 0, y: 40, rotateZ: -4 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateZ: -1.5 } : { opacity: 0, y: 40, rotateZ: -4 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Doc header */}
          <div className="px-5 pt-5 pb-3 border-b border-white/8">
            <div className="text-[0.8vw] font-semibold text-white/60 mb-1">Referral Summary</div>
            <div className="text-[0.65vw] text-white/30 font-mono">Phoenix General Hospital · 04/20/2026</div>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-[8px] font-bold">PDF</span>
              </div>
              <span className="text-[0.65vw] text-white/40">referral_thompson_marcus_042026.pdf</span>
            </div>
          </div>
          {/* Doc content - text line skeletons */}
          <div className="p-5 space-y-2.5">
            {docLines.map((line, i) => (
              <div
                key={i}
                className={`h-[6px] rounded-full ${line.dark ? 'bg-white/6' : 'bg-white/10'}`}
                style={{ width: line.w }}
              />
            ))}
          </div>
          {/* AI scan beam */}
          {phase >= 2 && (
            <motion.div
              className="absolute left-0 right-0 h-8 bg-gradient-to-b from-[#5BC8DC]/25 via-[#5BC8DC]/40 to-[#5BC8DC]/25 pointer-events-none"
              initial={{ top: '15%' }}
              animate={{ top: ['15%', '92%'] }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />
          )}
          {/* Reading done overlay */}
          {phase >= 3 && (
            <motion.div
              className="absolute inset-0 bg-[#5BC8DC]/5 border border-[#5BC8DC]/20 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center">
                <div className="text-[#5BC8DC] text-[1vw] font-semibold">✓ Analysis Complete</div>
                <div className="text-white/40 text-[0.7vw] mt-1">Claude processed in 1.3s</div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Right: Extracted fields + headline */}
      <div className="w-[52%] z-10 pl-4">
        <motion.div
          className="w-14 h-1 bg-[#5BC8DC] mb-5"
          initial={{ scaleX: 0 }}
          animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.7 }}
          style={{ originX: 0 }}
        />
        <motion.h2
          className="text-[3.2vw] font-bold text-white tracking-tight leading-tight mb-3"
          initial={{ opacity: 0, x: 30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          AI Reads<br />Referrals Instantly.
        </motion.h2>
        <motion.p
          className="text-[1vw] text-white/55 mb-5"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          Upload any referral PDF. Claude extracts demographics, insurance, clinical history, and builds a patient profile in under 2 seconds.
        </motion.p>

        {/* Extracted fields grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {extractedFields.map((field, i) => (
            <motion.div
              key={i}
              className="bg-[#0d1117] border border-white/8 rounded-xl px-4 py-3"
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={i < visibleFields ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: 10 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-[0.65vw] uppercase tracking-widest text-white/30 mb-1 font-mono">{field.label}</div>
              <div className="text-[0.85vw] font-semibold" style={{ color: field.color }}>{field.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
