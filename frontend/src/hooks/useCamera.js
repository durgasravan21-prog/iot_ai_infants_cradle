import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Custom hook — manages camera access with device selection.
 * Supports selecting from multiple cameras (built-in, USB, external).
 * Also supports IP camera streams via URL input.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isMirrored, setIsMirrored] = useState(false);
  const [loading, setLoading] = useState(false);

  // Enumerate all video input devices with Aggressive Search
  const enumerateDevices = useCallback(async () => {
    try {
      console.log("Searching for Phone Link devices...");
      // Requesting permissions first to unlock full labels
      const stream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(e => null);
      if(stream) stream.getTracks().forEach(t => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameraDevices(videoDevices);

      // Auto-select Phone Link or any device with "Virtual" or "Link" in name
      const bestMatch = videoDevices.find(d => 
        /phone|link|virtual|mobile|cam/i.test(d.label)
      );
      
      if (bestMatch && !selectedDeviceId) {
        console.log("Found Phone Link:", bestMatch.label);
        setSelectedDeviceId(bestMatch.deviceId);
      } else if (!selectedDeviceId && videoDevices.length > 0) {
         setSelectedDeviceId(videoDevices[0].deviceId);
      }
      return videoDevices;
    } catch (err) {
      setCameraError("ACCESS BLOCKED: Click the 'Lock' icon next to the URL and set Camera to 'Allow'");
      return [];
    }
  }, [selectedDeviceId]);

  const startCamera = useCallback(async (deviceId) => {
    try {
      setLoading(true);
      setCameraError(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const targetId = deviceId || selectedDeviceId;

      // START PROTOCOL: Try high performance link first, then fallback to basic
      const constraints = {
        video: targetId ? { deviceId: { ideal: targetId } } : true,
        audio: false
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // IMPORTANT: Native play trigger
          await videoRef.current.play();
        }
      } catch (e) {
        console.warn("Retrying with legacy device access...");
        const legacyStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = legacyStream;
        if (videoRef.current) {
          videoRef.current.srcObject = legacyStream;
          await videoRef.current.play();
        }
      }

      setCameraActive(true);
      setLoading(false);
    } catch (err) {
      // Diagnostic messages
      let msg = "Could not connect.";
      if (err.name === "NotAllowedError") msg = "PERMISSION DENIED: Browser camera access is OFF. Please enable it in Chrome/Edge settings.";
      if (err.name === "NotReadableError") msg = "HARDWARE BUSY: Close any other app using the camera (Phone Link app/Zoom/Teams).";
      
      setCameraError(msg);
      setCameraActive(false);
      setLoading(false);
    }
  }, [selectedDeviceId]);


  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
    setCameraActive(false);
    setCameraError(null);
  }, []);

  const switchCamera = useCallback(async (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (cameraActive) {
      await startCamera(deviceId);
    }
  }, [cameraActive, startCamera]);

  const toggleMirror = () => setIsMirrored(!isMirrored);

  // Listen for device changes (camera plugged in/out)
  useEffect(() => {
    const handleChange = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener("devicechange", handleChange);
    // Initial enumeration
    enumerateDevices();
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", handleChange);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [enumerateDevices]);

  return {
    videoRef,
    cameraActive,
    cameraError,
    cameraDevices,
    selectedDeviceId,
    isMirrored,
    loading,
    startCamera,
    stopCamera,
    switchCamera,
    enumerateDevices,
    toggleMirror,
  };
}
