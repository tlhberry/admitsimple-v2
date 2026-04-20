import { useState, useEffect, useRef, useCallback } from 'react';
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

const sceneOffsets = SCENES.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].duration);
  return acc;
}, []);

type RecordState = 'idle' | 'countdown' | 'recording' | 'done';

export default function VideoTemplate() {
  const [currentScene, setCurrentScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [countdown, setCountdown] = useState(3);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sceneStartRef = useRef<number>(Date.now());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const progress = (elapsed / TOTAL_DURATION) * 100;

  const jumpToScene = useCallback((idx: number) => {
    setCurrentScene(idx);
    setElapsed(sceneOffsets[idx]);
    sceneStartRef.current = Date.now();
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

        // If recording, stop after full cycle (scene 5 → scene 0 wraps)
        if (recordState === 'recording' && currentScene === SCENES.length - 1) {
          setRecordState('done');
          recorderRef.current?.stop();
        }

        setCurrentScene(nextScene);
        setElapsed(sceneOffsets[nextScene]);
        sceneStartRef.current = Date.now();
      } else {
        setElapsed(Math.min(newElapsed, TOTAL_DURATION));
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [currentScene, paused, recordState]);

  // Start recording flow
  const handleRecord = async () => {
    if (recordState !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        // @ts-ignore — Chrome-specific hint
        preferCurrentTab: true,
      });

      // Countdown
      setRecordState('countdown');
      setCountdown(3);
      let c = 3;
      const cd = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(cd);
          startCapture(stream);
        }
      }, 1000);
    } catch {
      // User cancelled
    }
  };

  const startCapture = (stream: MediaStream) => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admitsimple-linkedin-ad.webm';
      a.click();
      URL.revokeObjectURL(url);
      setRecordState('idle');
    };
    recorder.start();
    recorderRef.current = recorder;
    // Reset to scene 0 and begin
    jumpToScene(0);
    setRecordState('recording');
    // Auto stop after full duration + 1s buffer
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, TOTAL_DURATION + 1200);
  };

  const isRecording = recordState === 'recording';
  const isCountdown = recordState === 'countdown';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#1a2332]">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(91,200,220,0.10) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
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

      {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            className="absolute top-5 right-5 flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-full z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/70 text-xs font-mono">REC</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown overlay */}
      <AnimatePresence>
        {isCountdown && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <motion.div
                key={countdown}
                className="text-[15vw] font-bold text-white"
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {countdown}
              </motion.div>
              <p className="text-white/50 text-lg mt-4">Recording starts in {countdown}...</p>
              <p className="text-white/30 text-sm mt-2">Make sure this tab is selected in the screen picker</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls bar — hidden while recording */}
      <AnimatePresence>
        {!isRecording && !isCountdown && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50 px-5 pb-4 pt-8 bg-gradient-to-t from-black/70 to-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {/* Progress bar */}
            <div
              className="w-full h-1 bg-white/10 rounded-full mb-3 cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const targetMs = pct * TOTAL_DURATION;
                const sceneIdx = sceneOffsets.findLastIndex(o => o <= targetMs);
                jumpToScene(Math.max(0, Math.min(sceneIdx, SCENES.length - 1)));
              }}
            >
              <div
                className="h-full bg-[#5BC8DC] rounded-full transition-all duration-100 group-hover:h-1.5"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 flex-wrap">
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/80 transition-all"
              >
                {paused ? '▶ Play' : '⏸ Pause'}
              </button>

              <span className="text-[10px] text-white/25 font-mono">
                {Math.floor(elapsed / 1000)}s / {Math.floor(TOTAL_DURATION / 1000)}s
              </span>

              <button
                onClick={handleRecord}
                className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500/80 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-500/20"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Record & Download
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
