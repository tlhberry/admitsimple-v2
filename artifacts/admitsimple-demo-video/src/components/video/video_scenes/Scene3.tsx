import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 8000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center p-24" {...sceneTransitions.splitHorizontal}>
      <motion.div 
        className="absolute top-1/4 left-[15%] w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-[80px]"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      <div className="w-1/2 pr-16 relative z-10">
        <motion.div 
          className="relative w-full aspect-[3/4] max-h-[80vh] rounded-xl border border-white/20 shadow-2xl bg-white/5 backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0, y: 50, rotateZ: -5 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateZ: -2 } : { opacity: 0, y: 50, rotateZ: -5 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}images/referral-doc.png`} 
            className="w-full h-full object-cover opacity-80 mix-blend-screen"
            alt="Referral PDF"
          />
          {phase >= 2 && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-primary)]/30 to-transparent h-1/4"
              initial={{ top: '-30%' }}
              animate={{ top: '110%' }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            />
          )}
        </motion.div>
      </div>

      <div className="w-1/2 pl-8 z-10">
        <motion.h2 
          className="text-[3.5vw] font-bold text-white tracking-tight leading-tight"
          initial={{ opacity: 0, x: 40 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Instant AI Intake.
        </motion.h2>
        <motion.p 
          className="text-[1.2vw] text-white/70 mt-6 max-w-lg"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Upload a referral PDF. Claude extracts demographics, history, and builds a patient profile in seconds.
        </motion.p>

        <div className="mt-12 space-y-4">
          {['Demographics Extracted', 'Clinical History Parsed', 'Profile Created'].map((item, i) => (
            <motion.div 
              key={i}
              className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-lg w-fit"
              initial={{ opacity: 0, x: 20 }}
              animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' }}
            >
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              <span className="text-white/90 text-[1.1vw] font-mono">{item}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
