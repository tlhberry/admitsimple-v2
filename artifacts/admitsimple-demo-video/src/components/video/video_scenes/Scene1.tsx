import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const pains = [
    { text: "Leads tracked in spreadsheets", emoji: "📋" },
    { text: "Inbound calls going to voicemail", emoji: "📞" },
    { text: "No visibility into your pipeline", emoji: "🔍" },
  ];

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-20" {...sceneTransitions.fadeBlur}>
      <motion.div className="absolute top-0 right-0 w-[70vw] h-[70vw] bg-red-500/8 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4" />
      <motion.div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-[#5BC8DC]/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

      <div className="z-10 text-center max-w-5xl">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-[1vw] text-[#5BC8DC] font-medium mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8 }}
        >
          Built for addiction treatment admissions teams
        </motion.div>

        <motion.h1
          className="text-[4.5vw] font-bold text-white tracking-tight leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Admissions teams are drowning —<br />
          <span className="text-white/50">and losing patients because of it.</span>
        </motion.h1>

        <div className="mt-12 flex flex-col gap-4 items-center">
          {pains.map((pain, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 px-8 py-4 bg-red-500/8 border border-red-500/20 rounded-2xl text-[1.4vw] font-medium text-white/80 w-auto"
              initial={{ opacity: 0, x: -30 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-[1.6vw]">{pain.emoji}</span>
              <span>{pain.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-14 w-full h-[1px] bg-gradient-to-r from-transparent via-[#5BC8DC]/40 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={phase >= 3 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />

        <motion.h2
          className="mt-10 text-[3vw] font-bold text-[#5BC8DC]"
          initial={{ opacity: 0, filter: 'blur(12px)', y: 10 }}
          animate={phase >= 4 ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, filter: 'blur(12px)', y: 10 }}
          transition={{ duration: 1.2 }}
        >
          AdmitSimple was built to fix this.
        </motion.h2>
      </div>
    </motion.div>
  );
}
