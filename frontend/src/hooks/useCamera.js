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

      // 1. FRESH DEVICE SCAN: Find Phone Link even if it was just plugged in
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");
      
      const phoneLinkDevice = videoDevices.find(d => 
        /phone|link|virtual|mobile/i.test(d.label)
      );

      const targetId = deviceId || phoneLinkDevice?.deviceId || selectedDeviceId;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // 2. High-Performance Constraints for Virtual Cameras
      const constraints = {
        video: targetId ? { deviceId: { ideal: targetId } } : true,
        audio: false
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // FORCE WAKE: Some virtual cameras need multiple play calls
          await videoRef.current.play();
          setTimeout(() => videoRef.current && videoRef.current.play(), 500);
        }
      } catch (e) {
        // CATCH-ALL: If Phone Link name search fails, try basic camera
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
      }

      setCameraActive(true);
      if (phoneLinkDevice) setSelectedDeviceId(phoneLinkDevice.deviceId);
      setLoading(false);
    } catch (err) {
      setCameraError(err.name === "NotAllowedError" 
        ? "BROWSER BLOCKED: Click 'Allow' on the camera prompt at the top!" 
        : "PHONE LINK NOT READY: Make sure 'Link to Windows' is active on your phone.");
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
