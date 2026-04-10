import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 8000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-24" {...sceneTransitions.clipPolygon}>
      <div className="w-1/3 z-10 relative">
        <motion.div 
          className="w-16 h-1 bg-[var(--color-primary)] mb-8"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ originX: 0 }}
        />
        <motion.h2 
          className="text-[3.5vw] font-bold text-white tracking-tight leading-tight"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Clinical<br/>Admissions<br/>Pipeline.
        </motion.h2>
        <motion.p 
          className="text-[1.2vw] text-white/60 mt-6"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          8-stage precision tracking. From New Inquiry to Admitted. Complete visibility at every step.
        </motion.p>
      </div>

      <div className="w-7/12 relative h-[70vh]">
        <motion.div 
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl shadow-[var(--color-primary)]/10 border border-white/10"
          initial={{ opacity: 0, scale: 0.95, rotateY: 10, transformPerspective: 1000 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, rotateY: -5, transformPerspective: 1000 } : { opacity: 0, scale: 0.95, rotateY: 10, transformPerspective: 1000 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-bg-dark)] to-[#1E293B] opacity-80" />
          <img 
            src={`${import.meta.env.BASE_URL}images/pipeline-ui.png`} 
            className="w-full h-full object-cover opacity-90 mix-blend-lighten"
            alt="Pipeline UI"
          />
          {/* Scanning line effect */}
          <motion.div 
            className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"
            animate={{ left: ['-20%', '120%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 2.5 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
