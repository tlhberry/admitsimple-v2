import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

const tiers = [
  { name: "Done-For-You", desc: "We build and configure it for your team", tag: "$5K–$10K" },
  { name: "Hosted SaaS", desc: "We host, maintain, and update it for you", tag: "$499/mo" },
  { name: "Perpetual License", desc: "Buy once — source code, your AWS, forever", tag: "One-Time", highlight: true },
  { name: "Enterprise", desc: "One deal covers every facility in your portfolio", tag: "Flat fee" },
];

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 8000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-24" {...sceneTransitions.clipCircle}>
      <motion.div className="absolute inset-0 bg-gradient-to-br from-[#5BC8DC]/5 via-transparent to-transparent" />

      {/* Left copy */}
      <div className="w-2/5 z-10">
        <motion.div
          className="w-16 h-1 bg-[#5BC8DC] mb-6"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ originX: 0 }}
        />
        <motion.h2
          className="text-[3.5vw] font-bold text-white leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Buy it once.<br />
          <span className="text-[#5BC8DC]">Own it forever.</span>
        </motion.h2>

        <motion.p
          className="text-[1.2vw] text-white/60 mt-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          The old "pay us forever" SaaS model is dying. AdmitSimple gives you real options — own it, subscribe, or let us set it up for you.
        </motion.p>

        <motion.div
          className="mt-8 space-y-3"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {[
            "No AI markups — use your own Anthropic key",
            "No per-seat fees on perpetual license",
            "Full source code access — modify anything",
          ].map((point, i) => (
            <div key={i} className="flex items-center gap-3 text-[1vw] text-white/70">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5BC8DC] flex-shrink-0" />
              <span>{point}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right: Pricing cards */}
      <div className="w-1/2 z-10 grid grid-cols-2 gap-4">
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            className={`rounded-2xl p-6 border ${tier.highlight
              ? 'bg-[#5BC8DC]/10 border-[#5BC8DC]/40 shadow-lg shadow-[#5BC8DC]/10'
              : 'bg-white/4 border-white/8'
            }`}
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.92 }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
          >
            {tier.highlight && (
              <div className="text-[0.7vw] font-bold text-[#5BC8DC] uppercase tracking-widest mb-2">Most Control</div>
            )}
            <div className={`text-[1.8vw] font-bold mb-1 ${tier.highlight ? 'text-[#5BC8DC]' : 'text-white'}`}>
              {tier.tag}
            </div>
            <div className="text-[0.95vw] font-semibold text-white/80">{tier.name}</div>
            <div className="text-[0.8vw] text-white/40 mt-1 leading-snug">{tier.desc}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
