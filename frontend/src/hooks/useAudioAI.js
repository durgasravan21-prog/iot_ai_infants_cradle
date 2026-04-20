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

        // 3. Harmonic Dominance Check (Crucial for filtering out talking)
        // Baby cries are "tonal" and concentrated in the target band.
        // Talking is "broadband" noise that fills the whole spectrum.
        // We check if the target band is significantly LOUDER than the rest of the spectrum average.
        const bandToNoiseRatio = cryIntensity / (avg + 0.01); 

        // 4. Intensity Sustenance Checklist
        const now = Date.now();
        
        // Logic: Loud enough + Target frequency is dominant over surrounding noise + Persistence
        if (avg > 0.12 && cryIntensity > 0.35 && bandToNoiseRatio > 1.4) {
          intensityRef.current.count++;
          intensityRef.current.lastActive = now;
          
          if (intensityRef.current.count > 5) {
            setAudioStatus("Potential Cry...");
          }
        } else if (now - intensityRef.current.lastActive > RHYTHM_COOLDOWN) {
          // If quiet, cool down much faster to clear false alerts
          intensityRef.current.count = Math.max(0, intensityRef.current.count - 2);
          if (intensityRef.current.count === 0) {
            setIsCrying(false);
            setAudioStatus("Quiet / Speech");
          }
        }

        // 5. Sustained Confidence (approx 3-5 seconds of continuous detection)
        // This prevents short talking bursts or claps from triggering emails.
        if (intensityRef.current.count > 60) {
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
