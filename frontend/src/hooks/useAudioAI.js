import { useState, useEffect, useRef } from "react";

export const useAudioAI = (isActive) => {
  const [isCrying, setIsCrying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioStatus, setAudioStatus] = useState("Idle");

  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  // Configuration for crying detection
  const CRYING_MIN_HZ = 350;
  const CRYING_MAX_HZ = 650;
  const VOLUME_THRESHOLD = 0.15; // Normalized 0-1
  const RHYTHM_COOLDOWN = 1500; // Time baby needs to stay quiet to reset
  const DETECTION_WINDOW = 2000; // Must detect intensity over time
  
  const intensityRef = useRef({ count: 0, lastActive: 0 });

  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 256;
        source.connect(analyzerRef.current);

        setAudioStatus("Listening...");
        analyze();
      } catch (err) {
        console.error("Audio AI failed to start:", err);
        setAudioStatus("Mic Access Denied");
      }
    };

    const analyze = () => {
      const bufferLength = analyzerRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkSound = () => {
        analyzerRef.current.getByteFrequencyData(dataArray);
        
        // 1. Calculate Average Volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength / 255;
        setAudioLevel(Math.floor(avg * 100));

        // 2. Frequency Analysis (Target baby cry range ~400-600Hz)
        // FFT bin index = frequency * fftSize / sampleRate
        const sampleRate = audioContextRef.current.sampleRate;
        const binSize = sampleRate / analyzerRef.current.fftSize;
        const startBin = Math.floor(CRYING_MIN_HZ / binSize);
        const endBin = Math.ceil(CRYING_MAX_HZ / binSize);
        
        let cryEnergy = 0;
        for (let i = startBin; i <= endBin; i++) {
          cryEnergy += dataArray[i];
        }
        const cryIntensity = cryEnergy / (endBin - startBin + 1) / 255;

        // 3. Heuristic Decision
        const now = Date.now();
        if (avg > VOLUME_THRESHOLD && cryIntensity > 0.4) {
          intensityRef.current.count++;
          intensityRef.current.lastActive = now;
          setAudioStatus("Activity Detected");
        } else if (now - intensityRef.current.lastActive > RHYTHM_COOLDOWN) {
          intensityRef.current.count = Math.max(0, intensityRef.current.count - 1);
          if (intensityRef.current.count === 0) {
            setIsCrying(false);
            setAudioStatus("Quiet");
          }
        }

        // Trigger Alert if pattern sustained
        if (intensityRef.current.count > 15) {
          setIsCrying(true);
          setAudioStatus("⚠️ CRYING DETECTED");
        }

        rafRef.current = requestAnimationFrame(checkSound);
      };

      checkSound();
    };

    startAudio();

    return cleanup;
  }, [isActive]);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setAudioStatus("Idle");
    setIsCrying(false);
    setAudioLevel(0);
  };

  return { isCrying, audioLevel, audioStatus };
};
