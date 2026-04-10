import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';
import logoImg from '@assets/ChatGPT_Image_Apr_8,_2026,_06_01_28_PM_1775686437346.png';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 6500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center" {...sceneTransitions.fadeBlur}>
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-primary)]/10 to-[var(--color-bg-dark)] opacity-60"
      />
      
      <div className="z-10 flex flex-col items-center">
        <motion.div 
          className="w-[20vw] mb-12"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <img 
            src={logoImg} 
            alt="AdmitSimple Logo" 
            className="w-full h-auto object-contain mix-blend-screen brightness-125"
          />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <p className="text-[1.8vw] font-medium text-white tracking-wide">
            Built for operators who take admissions seriously
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 text-white/50 text-[1vw] font-mono">
            <span>admit-simple.com</span>
            <span>•</span>
            <span>HIPAA Compliant</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
