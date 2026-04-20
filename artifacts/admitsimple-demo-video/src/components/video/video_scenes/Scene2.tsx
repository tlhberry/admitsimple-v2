import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

const stages = [
  {
    name: "New Inquiry",
    color: "#6B7280",
    count: 12,
    cards: [
      { name: "Marcus T.", ins: "BCBS PPO", dx: "Opioid Use Disorder" },
      { name: "Rebecca S.", ins: "Aetna HMO", dx: "Alcohol Use Disorder" },
    ],
  },
  {
    name: "Insurance Verify",
    color: "#F59E0B",
    count: 8,
    cards: [
      { name: "Jordan C.", ins: "UHC PPO", dx: "Polysubstance" },
      { name: "Alicia M.", ins: "Cigna", dx: "Opioid Use Disorder" },
    ],
  },
  {
    name: "Pre-Assessment",
    color: "#3B82F6",
    count: 5,
    cards: [
      { name: "Daniel R.", ins: "BCBS PPO", dx: "Meth Use Disorder" },
    ],
  },
  {
    name: "Scheduled",
    color: "#8B5CF6",
    count: 4,
    cards: [
      { name: "Sarah L.", ins: "Aetna", dx: "Opioid Use Disorder" },
      { name: "Kevin P.", ins: "UHC", dx: "Alcohol Use Disorder" },
    ],
  },
  {
    name: "Admitted",
    color: "#22C55E",
    count: 7,
    cards: [
      { name: "Tanya W.", ins: "BCBS", dx: "Polysubstance", bed: "A-02" },
    ],
  },
];

function PatientCard({ card, delay, phase }: { card: typeof stages[0]['cards'][0]; delay: number; phase: number }) {
  return (
    <motion.div
      className="bg-[#0d1117] border border-white/8 rounded-lg p-3 mb-2"
      initial={{ opacity: 0, y: 8 }}
      animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-[#5BC8DC]/20 flex items-center justify-center text-[7px] text-[#5BC8DC] font-bold">
          {card.name.split(' ').map(n => n[0]).join('')}
        </div>
        <span className="text-white/85 text-[8px] font-semibold">{card.name}</span>
      </div>
      <div className="text-[7px] text-white/40">{card.ins}</div>
      <div className="text-[7px] text-[#5BC8DC]/70 mt-0.5">{card.dx}</div>
      {'bed' in card && card.bed && (
        <div className="mt-1.5 text-[6px] font-mono bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded w-fit">
          Bed {card.bed}
        </div>
      )}
    </motion.div>
  );
}

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 8500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-16 gap-8" {...sceneTransitions.clipPolygon}>
      {/* Left copy */}
      <div className="w-[28%] z-10 flex-shrink-0">
        <motion.div
          className="w-16 h-1 bg-[#5BC8DC] mb-6"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ originX: 0 }}
        />
        <motion.h2
          className="text-[3.2vw] font-bold text-white tracking-tight leading-tight"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Clinical<br/>Admissions<br/>Pipeline.
        </motion.h2>
        <motion.p
          className="text-[1.1vw] text-white/55 mt-5 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          8 stages. Every inquiry tracked from first contact to admitted — with full insurance, clinical, and bed data.
        </motion.p>
        <motion.div
          className="mt-6 space-y-2"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {["New Inquiry → Initial Contact", "Insurance Verify → Pre-Assessment", "Scheduled → Admitted → Discharged"].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-[0.85vw] text-white/45">
              <div className="w-1 h-1 rounded-full bg-[#5BC8DC]/60" />
              <span>{step}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right: Pipeline kanban mockup */}
      <div className="flex-1 z-10 relative h-[72vh]">
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#5BC8DC]/5 bg-[#111827]"
          initial={{ opacity: 0, scale: 0.93, rotateY: 8, transformPerspective: 1200 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, rotateY: -3, transformPerspective: 1200 } : { opacity: 0, scale: 0.93, rotateY: 8 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1117] border-b border-white/8">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            <span className="ml-3 text-[0.7vw] text-white/25 font-mono">AdmitSimple — Pipeline</span>
            <div className="ml-auto flex items-center gap-3 text-[0.65vw] text-white/25">
              <span>36 Active</span>
              <div className="w-1 h-1 rounded-full bg-[#5BC8DC]" />
              <span>Sunrise Recovery</span>
            </div>
          </div>

          {/* Kanban columns */}
          <div className="flex gap-3 p-4 h-[calc(100%-44px)] overflow-hidden">
            {stages.map((stage, si) => (
              <motion.div
                key={si}
                className="flex-1 min-w-0 flex flex-col"
                initial={{ opacity: 0, y: 16 }}
                animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                transition={{ duration: 0.6, delay: 0.05 * si }}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[7px] font-semibold text-white/60 uppercase tracking-wide truncate">{stage.name}</span>
                  <span className="ml-auto text-[7px] text-white/30 font-mono">{stage.count}</span>
                </div>
                {/* Cards */}
                <div className="flex-1 space-y-0">
                  {stage.cards.map((card, ci) => (
                    <PatientCard
                      key={ci}
                      card={card}
                      delay={0.1 + si * 0.05 + ci * 0.08}
                      phase={phase}
                    />
                  ))}
                  {/* Placeholder skeleton cards */}
                  {stage.count > stage.cards.length && (
                    <motion.div
                      className="bg-white/3 border border-dashed border-white/8 rounded-lg p-3 h-10"
                      initial={{ opacity: 0 }}
                      animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + si * 0.06 }}
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Scanning highlight */}
          <motion.div
            className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#5BC8DC]/8 to-transparent pointer-events-none"
            animate={{ left: ['-15%', '115%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 2 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
