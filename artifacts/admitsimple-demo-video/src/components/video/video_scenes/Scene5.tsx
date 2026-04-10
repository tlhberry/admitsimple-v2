import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

export function Scene5() {
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
    <motion.div className="absolute inset-0 flex items-center justify-center p-24" {...sceneTransitions.clipCircle}>
      <div className="w-1/2 pr-12 z-10">
        <motion.div 
          className="w-16 h-1 bg-white mb-8"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ originX: 0 }}
        />
        <motion.h2 
          className="text-[3.5vw] font-bold text-white tracking-tight leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          HIPAA &<br/>Ownership.
        </motion.h2>
        
        <motion.div 
          className="mt-10 space-y-6"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[1.3vw] text-white/80 border-l-2 border-[var(--color-primary)] pl-6 py-2">
            Runs on your own AWS VPC.
          </p>
          <p className="text-[1.3vw] text-white/80 border-l-2 border-[var(--color-primary)] pl-6 py-2">
            Bring your own Anthropic key.
          </p>
          <p className="text-[1.3vw] text-white/80 border-l-2 border-[var(--color-primary)] pl-6 py-2">
            No data middlemen. No AI markup.
          </p>
        </motion.div>
      </div>

      <div className="w-1/2 flex justify-center z-10">
        <motion.div 
          className="relative w-[30vw] h-[30vw] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.8, rotateY: -30 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <div className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-full blur-[60px]" />
          <img 
            src={`${import.meta.env.BASE_URL}images/hipaa-lock.png`} 
            className="w-full h-full object-contain mix-blend-screen relative z-10"
            alt="HIPAA Security Lock"
          />
          <motion.div 
            className="absolute inset-0 border-2 border-[var(--color-primary)]/30 rounded-full"
            animate={{ scale: [1, 1.2], opacity: [0.8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 1.5 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
