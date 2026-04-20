import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';
import logoImg from '@assets/Untitled_1775863851436.png';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center" {...sceneTransitions.fadeBlur}>
      <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#5BC8DC]/8 to-[#0d1117]" />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-[#5BC8DC]/6 rounded-full blur-[120px]"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="z-10 flex flex-col items-center text-center">
        <motion.div
          className="w-[18vw] mb-8"
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 16 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          <img src={logoImg} alt="AdmitSimple" className="w-full h-auto object-contain mix-blend-screen brightness-125" />
        </motion.div>

        <motion.h2
          className="text-[3.2vw] font-bold text-white mb-4 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          The admissions platform built<br />for operators who are serious.
        </motion.h2>

        <motion.p
          className="text-[1.3vw] text-white/55 mb-10 max-w-2xl"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Own it outright, subscribe, or let us set it up for you. No recurring software fees required.
        </motion.p>

        <motion.div
          className="flex items-center gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9 }}
        >
          <div className="px-10 py-4 bg-[#5BC8DC] text-[#0d1117] rounded-2xl font-bold text-[1.4vw] shadow-xl shadow-[#5BC8DC]/25">
            Request a Demo
          </div>
          <div className="px-10 py-4 border border-white/15 text-white/80 rounded-2xl text-[1.4vw]">
            admitsimple.com
          </div>
        </motion.div>

        <motion.div
          className="mt-10 flex items-center gap-4 text-white/25 text-[0.85vw] font-mono"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <span>HIPAA Compliant</span>
          <span>•</span>
          <span>Built on AWS</span>
          <span>•</span>
          <span>Perpetual License Available</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
