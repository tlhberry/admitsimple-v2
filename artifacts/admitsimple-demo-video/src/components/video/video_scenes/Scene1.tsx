import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 4500),
      setTimeout(() => setPhase(5), 7500), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-20" {...sceneTransitions.fadeBlur}>
      <motion.div className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-red-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
      
      <div className="z-10 text-center max-w-4xl">
        <motion.h1 
          className="text-[4vw] font-bold text-white tracking-tight leading-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Admissions teams are drowning.
        </motion.h1>
        
        <div className="mt-16 flex gap-8 justify-center">
          {[
            { text: "Missed Calls", delay: 0 },
            { text: "Lost Referrals", delay: 0.1 },
            { text: "Zero Visibility", delay: 0.2 }
          ].map((item, i) => (
            <motion.div 
              key={i}
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md text-[1.5vw] font-medium text-white/80"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.8, delay: item.delay, ease: [0.16, 1, 0.3, 1] }}
            >
              {item.text}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-20 w-full h-[1px] bg-gradient-to-r from-transparent via-[#EF4444]/50 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={phase >= 3 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
        
        <motion.h2 
          className="mt-12 text-[2.5vw] text-white/90 font-medium"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 4 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 1.2 }}
        >
          The chaos ends here.
        </motion.h2>
      </div>
    </motion.div>
  );
}
