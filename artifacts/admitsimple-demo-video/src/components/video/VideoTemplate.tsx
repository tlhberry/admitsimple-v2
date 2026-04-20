import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENES = [
  { key: 'problem', label: 'The Problem', duration: 9000 },
  { key: 'pipeline', label: 'Pipeline', duration: 9500 },
  { key: 'aiIntake', label: 'AI Intake', duration: 9500 },
  { key: 'stats', label: 'Live Stats', duration: 9500 },
  { key: 'ownership', label: 'Buy It Once', duration: 9500 },
  { key: 'close', label: 'CTA', duration: 8000 },
];

const TOTAL_DURATION = SCENES.reduce((sum, s) => sum + s.duration, 0);

export default function VideoTemplate() {
  const [currentScene, setCurrentScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sceneStartRef = useRef<number>(0);
  const sceneOffsetRef = useRef<number>(0); // elapsed ms at start of current scene

  // Calculate scene offset for each scene
  const sceneOffsets = SCENES.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].duration);
    return acc;
  }, []);

  // Advance timer
  useEffect(() => {
    if (paused) return;
    sceneStartRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const newElapsed = sceneOffsets[currentScene] + (now - sceneStartRef.current);

      if (newElapsed >= sceneOffsets[currentScene] + SCENES[currentScene].duration) {
        const nextScene = (currentScene + 1) % SCENES.length;
        setCurrentScene(nextScene);
        sceneOffsetRef.current = sceneOffsets[nextScene];
        setElapsed(sceneOffsets[nextScene]);
        sceneStartRef.current = Date.now();
      } else {
        setElapsed(Math.min(newElapsed, TOTAL_DURATION));
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [currentScene, paused]);

  const progress = (elapsed / TOTAL_DURATION) * 100;

  const jumpToScene = (idx: number) => {
    setCurrentScene(idx);
    setElapsed(sceneOffsets[idx]);
    sceneStartRef.current = Date.now();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#1a2332]">
      {/* Background glow */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 mix-blend-overlay"
          style={{ background: 'radial-gradient(circle at center, rgba(91,200,220,0.12) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Scenes */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="problem" />}
        {currentScene === 1 && <Scene2 key="pipeline" />}
        {currentScene === 2 && <Scene3 key="aiIntake" />}
        {currentScene === 3 && <Scene4 key="stats" />}
        {currentScene === 4 && <Scene5 key="ownership" />}
        {currentScene === 5 && <Scene6 key="close" />}
      </AnimatePresence>

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-50 px-6 pb-4 pt-6 bg-gradient-to-t from-black/60 to-transparent">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-3 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          const targetMs = pct * TOTAL_DURATION;
          const sceneIdx = sceneOffsets.findLastIndex(o => o <= targetMs);
          jumpToScene(Math.max(0, Math.min(sceneIdx, SCENES.length - 1)));
        }}>
          <div className="h-full bg-[#5BC8DC] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>

        {/* Scene tabs */}
        <div className="flex items-center gap-2">
          {SCENES.map((scene, i) => (
            <button
              key={i}
              onClick={() => jumpToScene(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentScene === i
                  ? 'bg-[#5BC8DC] text-[#0d1117]'
                  : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/80'
              }`}
            >
              {scene.label}
            </button>
          ))}
          <button
            onClick={() => setPaused(p => !p)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/80 transition-all"
          >
            {paused ? '▶ Play' : '⏸ Pause'}
          </button>
          <span className="text-[10px] text-white/25 font-mono">
            {Math.floor(elapsed / 1000)}s / {Math.floor(TOTAL_DURATION / 1000)}s
          </span>
        </div>
      </div>
    </div>
  );
}
