import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

const stats = [
  { value: "180", label: "Inquiries", sub: "tracked over 6 months", color: "#5BC8DC" },
  { value: "34", label: "Beds Managed", sub: "across 3 units", color: "#22C55E" },
  { value: "312", label: "SMS Logs", sub: "conversations tracked", color: "#8B5CF6" },
  { value: "60", label: "Admissions", sub: "with full clinical records", color: "#F97316" },
];

const feed = [
  { time: "9:14am", text: "New inquiry — Marcus T. | BCBS PPO | Opioid Use Disorder", dot: "#5BC8DC" },
  { time: "9:31am", text: "AI: VOB complete — 30 days authorized, $0 deductible remaining", dot: "#F97316" },
  { time: "10:02am", text: "Stage moved → Pre-Assessment (AI suggestion accepted)", dot: "#22C55E" },
  { time: "11:18am", text: "Inbound SMS: 'Do you accept Aetna?' — Jake replied in 4 min", dot: "#8B5CF6" },
  { time: "2:45pm", text: "Sarah L. admitted to Bed D-04 — Detox unit", dot: "#22C55E" },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 8500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center px-24 gap-14" {...sceneTransitions.zoomThrough}>
      {/* Left: Stats */}
      <div className="w-2/5 z-10">
        <motion.div
          className="w-16 h-1 bg-[#5BC8DC] mb-6"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ originX: 0 }}
        />
        <motion.h2
          className="text-[3vw] font-bold text-white leading-tight mb-3"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Every inquiry.<br />Every bed.<br />One platform.
        </motion.h2>
        <motion.p
          className="text-[1.1vw] text-white/50 mb-8"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          Built to run a real 34-bed treatment center — not a demo environment.
        </motion.p>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="bg-white/4 border border-white/8 rounded-2xl p-5"
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.88, y: 12 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.09 }}
            >
              <div className="text-[2.8vw] font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[1vw] font-semibold text-white/80">{stat.label}</div>
              <div className="text-[0.8vw] text-white/35 mt-0.5">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: Live feed */}
      <div className="w-3/5 z-10">
        <motion.div
          className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, scale: 0.95, x: 30 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.95, x: 30 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2 px-5 py-4 bg-[#060a0f] border-b border-white/8">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-[0.85vw] text-white/30 font-mono">Sunrise Recovery — Today's Activity</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[0.75vw] text-green-400/70 font-mono">Live</span>
            </div>
          </div>
          <div className="p-5 space-y-2.5">
            {feed.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 px-4 py-3 bg-white/3 rounded-xl border border-white/5"
                initial={{ opacity: 0, x: 16 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.13 }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.dot }} />
                <p className="flex-1 text-[0.9vw] text-white/75 leading-snug">{item.text}</p>
                <span className="text-[0.75vw] text-white/25 font-mono flex-shrink-0">{item.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
