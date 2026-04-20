import { useRef, useState, useEffect } from 'react';

// Helper: Calculate distance between two 3D points
function distance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
  );
}

// Calculate Eye Aspect Ratio (EAR)
function calculateEAR(eyeLandmarks, landmarks) {
  const p1 = landmarks[eyeLandmarks[0]];
  const p4 = landmarks[eyeLandmarks[3]];
  const p2 = landmarks[eyeLandmarks[1]];
  const p6 = landmarks[eyeLandmarks[5]];
  const p3 = landmarks[eyeLandmarks[2]];
  const p5 = landmarks[eyeLandmarks[4]];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

  const horizontalDist = distance(p1, p4);
  const verticalDist1 = distance(p2, p6);
  const verticalDist2 = distance(p3, p5);

  return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
}

export function useVisionAI(videoRef, isLive) {
  const [eyesOpen, setEyesOpen] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [motionLevel, setMotionLevel] = useState(0);

  const faceMeshRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const prevFrameRef = useRef(null);
  const animationRef = useRef(null);
  const lastProcessTime = useRef(0);

  // Load MediaPipe dynamically via CDN to bypass bundler issues
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (!window.FaceMesh) {
        setAiStatus("AI Load Failed");
        return;
      }
      
      const faceMesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          setAiStatus("Face tracking active");
          const landmarks = results.multiFaceLandmarks[0];

          // Eye indices (MediaPipe 468 landmarks)
          const leftEye = [33, 160, 158, 133, 153, 144];
          const rightEye = [362, 385, 387, 263, 373, 380];

          const leftEAR = calculateEAR(leftEye, landmarks);
          const rightEAR = calculateEAR(rightEye, landmarks);
          const avgEAR = (leftEAR + rightEAR) / 2;

          // Eye State
          setEyesOpen(avgEAR > 0.25);

          // Mouth Open State (Landmarks: 13=Upper, 14=Lower)
          const pUpper = landmarks[13];
          const pLower = landmarks[14];
          if (pUpper && pLower) {
            const mouthDist = distance(pUpper, pLower);
            // Normalized check: if distance between lips > 5% of face height approx
            // Landmarks are 0-1, so 0.05 is quite open
            setMouthOpen(mouthDist > 0.04);
          }
        } else {
          setAiStatus("No face detected");
          setEyesOpen(false);
          setMouthOpen(false);
        }
      });

      faceMeshRef.current = faceMesh;
    };
    
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (faceMeshRef.current) faceMeshRef.current.close();
    };
  }, []);

  // Frame Processing Loop
  useEffect(() => {
    if (!isLive || !videoRef.current) return;

    const processFrame = async () => {
      const video = videoRef.current;
      if (video.readyState >= 2) {
        const now = Date.now();
        
        // 1. Motion Detection (Run 10 times a sec)
        if (now - lastProcessTime.current > 100) {
          lastProcessTime.current = now;

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          // Downscale for fast motion check
          canvas.width = 64; 
          canvas.height = 64;
          ctx.drawImage(video, 0, 0, 64, 64);
          
          const frameData = ctx.getImageData(0, 0, 64, 64).data;

          if (prevFrameRef.current) {
            let diffCounter = 0;
            // Compare pixels
            for (let i = 0; i < frameData.length; i += 4) {
              const rDiff = Math.abs(frameData[i] - prevFrameRef.current[i]);
              const gDiff = Math.abs(frameData[i+1] - prevFrameRef.current[i+1]);
              const bDiff = Math.abs(frameData[i+2] - prevFrameRef.current[i+2]);
              
              if (rDiff > 20 || gDiff > 20 || bDiff > 20) {
                diffCounter++;
              }
            }
            // Percentage of screen that moved
            const movePercent = (diffCounter / (64 * 64)) * 100;
            setMotionLevel(Math.min(100, Math.round(movePercent)));
          }

          prevFrameRef.current = new Uint8ClampedArray(frameData);

          // 2. Face Mesh Processing (Run async)
          try {
            if (faceMeshRef.current && window.FaceMesh) {
              await faceMeshRef.current.send({ image: video });
            }
          } catch (e) {}
        }
      }

      animationRef.current = requestAnimationFrame(processFrame);
    };

    animationRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLive, videoRef]);

  return {
    aiStatus,
    eyesOpen,
    mouthOpen,
    motionLevel
  };
}
