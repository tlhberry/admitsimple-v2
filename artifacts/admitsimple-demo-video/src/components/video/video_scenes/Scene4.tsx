import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 8000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center" {...sceneTransitions.zoomThrough}>
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-dark)] via-[#1E293B] to-[var(--color-bg-dark)] opacity-50"
      />
      
      <div className="z-10 text-center mb-16">
        <motion.h2 
          className="text-[3.5vw] font-bold text-white tracking-tight"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          Live Inbound Calls.
        </motion.h2>
        <motion.p 
          className="text-[1.2vw] text-[var(--color-primary)] mt-4 font-mono uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          Auto-saves with every keystroke
        </motion.p>
      </div>

      <div className="relative z-10 w-[60vw] h-[40vh] flex items-center justify-center">
        <motion.div 
          className="absolute inset-0 rounded-3xl border border-white/10 bg-[#0F172A]/80 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="h-16 border-b border-white/10 flex items-center px-8 bg-white/5">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mr-4" />
            <span className="text-white font-medium text-[1vw]">Incoming Call: +1 (555) 019-2834</span>
          </div>
          
          <div className="flex-1 p-8 grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-4 w-1/3 bg-white/10 rounded" />
              <div className="h-10 w-full bg-white/5 border border-white/10 rounded flex items-center px-4">
                <motion.div 
                  className="h-4 bg-[var(--color-primary)]/50 rounded"
                  initial={{ width: 0 }}
                  animate={phase >= 3 ? { width: '45%' } : { width: 0 }}
                  transition={{ duration: 2, delay: 0.5 }}
                />
              </div>
              <div className="h-4 w-1/4 bg-white/10 rounded mt-8" />
              <div className="h-10 w-full bg-white/5 border border-white/10 rounded" />
            </div>
            <div className="border-l border-white/10 pl-8 space-y-4">
               <div className="h-4 w-1/2 bg-white/10 rounded" />
               <div className="h-24 w-full bg-white/5 border border-white/10 rounded" />
               
               <motion.div 
                className="mt-8 text-[0.9vw] text-green-400 font-mono flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: [0, 1, 0, 1] } : { opacity: 0 }}
                transition={{ duration: 1.5, delay: 1 }}
               >
                 <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                 Saving draft...
               </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
