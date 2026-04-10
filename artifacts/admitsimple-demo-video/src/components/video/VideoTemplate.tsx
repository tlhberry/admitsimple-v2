import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = { 
  problem: 9000, 
  pipeline: 9500, 
  aiIntake: 9500, 
  liveCalls: 9500, 
  hipaa: 9500, 
  close: 8000 
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-bg-dark)]">
      {/* Persistent background layer */}
      <div className="absolute inset-0 opacity-40">
        <video 
          src={`${import.meta.env.BASE_URL}videos/bg-network.mp4`} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-30 mix-blend-screen"
        />
        <motion.div 
          className="absolute inset-0 mix-blend-overlay"
          style={{ background: 'radial-gradient(circle at center, rgba(91,200,220,0.15) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="problem" />}
        {currentScene === 1 && <Scene2 key="pipeline" />}
        {currentScene === 2 && <Scene3 key="aiIntake" />}
        {currentScene === 3 && <Scene4 key="liveCalls" />}
        {currentScene === 4 && <Scene5 key="hipaa" />}
        {currentScene === 5 && <Scene6 key="close" />}
      </AnimatePresence>
    </div>
  );
}
