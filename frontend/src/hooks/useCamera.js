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

  // Enumerate all video input devices
  const enumerateDevices = useCallback(async () => {
    try {
      // Need a temporary stream to get device labels (browser security)
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameraDevices(videoDevices);

      // Auto-select "Phone Link" if found
      if (videoDevices.length > 0) {
        const phoneLinkCam = videoDevices.find(d => 
          d.label.toLowerCase().includes("phone link") || 
          d.label.toLowerCase().includes("virtual") ||
          d.label.toLowerCase().includes("mobile") ||
          d.label.toLowerCase().includes(" droid") ||
          d.label.toLowerCase().includes(" cam")
        );
        if (phoneLinkCam) {
          setSelectedDeviceId(phoneLinkCam.deviceId);
        } else if (!selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      }
      return videoDevices;
    } catch (err) {
      console.error("Cannot enumerate devices:", err);
      setCameraError("Camera permission denied. Please allow camera access.");
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

      // FORCED COMPATIBILITY: Remove specific resolution logic if it fails
      const constraints = {
        video: targetId ? { deviceId: { ideal: targetId } } : { facingMode: "user" },
        audio: false,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (retryErr) {
        // Fallback catch-all for virtual cameras
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      }

      setCameraActive(true);
      setLoading(false);
    } catch (err) {
      console.error("Camera fail:", err);
      setCameraError("Camera blocked by Windows. Ensure Phone Link app is OPEN and 'Camera' is enabled in Settings.");
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
