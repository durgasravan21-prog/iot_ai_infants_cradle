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
  const [cameraMode, setCameraMode] = useState("device"); // "device" or "ip"
  const [ipCameraUrl, setIpCameraUrl] = useState("");
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

      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
      return videoDevices;
    } catch (err) {
      console.error("Cannot enumerate devices:", err);
      setCameraError("Camera permission denied. Please allow camera access.");
      return [];
    }
  }, [selectedDeviceId]);

  // Start camera from selected device
  const startCamera = useCallback(async (deviceId) => {
    try {
      setLoading(true);
      setCameraError(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const targetId = deviceId || selectedDeviceId;

      const constraints = {
        video: targetId
          ? { deviceId: { exact: targetId } }
          : true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setLoading(false);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(err.message || "Could not access camera");
      setCameraActive(false);
      setLoading(false);
    }
  }, [selectedDeviceId]);

  // Start IP camera stream
  const startIpCamera = useCallback((url) => {
    try {
      setCameraError(null);
      setLoading(true);

      // Stop any existing device stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.crossOrigin = "anonymous";
        videoRef.current.play().catch(() => {
          // For MJPEG streams, the video tag won't play — we switch to img mode
          setCameraError(null);
        });
      }

      setCameraActive(true);
      setLoading(false);
    } catch (err) {
      setCameraError("Failed to connect to IP camera");
      setLoading(false);
    }
  }, []);

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
    cameraMode,
    ipCameraUrl,
    loading,
    setCameraMode,
    setIpCameraUrl,
    startCamera,
    startIpCamera,
    stopCamera,
    switchCamera,
    enumerateDevices,
  };
}
