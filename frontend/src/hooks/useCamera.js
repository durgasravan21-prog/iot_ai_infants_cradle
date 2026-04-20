import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useCamera — clean camera hook.
 * When startCamera(deviceId) is called with a specific deviceId,
 * it connects to EXACTLY that device — no auto-detection, no overrides.
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

  // Enumerate video devices (just lists them, no auto-selection)
  const enumerateDevices = useCallback(async () => {
    try {
      // Request permission first to unlock labels
      const stream = await navigator.mediaDevices
        .getUserMedia({ video: true })
        .catch(() => null);
      if (stream) stream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameraDevices(videoDevices);

      console.log(
        "Camera devices:",
        videoDevices.map((d) => d.label)
      );

      return videoDevices;
    } catch (err) {
      setCameraError(
        "ACCESS BLOCKED: Click the Lock icon next to the URL and set Camera to Allow"
      );
      return [];
    }
  }, []);

  /**
   * startCamera — connects to a SPECIFIC camera.
   * @param {string} deviceId — if provided, uses { exact: deviceId }
   *                             to guarantee the correct camera is used.
   *                             If not provided, uses the browser default.
   */
  const startCamera = useCallback(
    async (deviceId) => {
      try {
        setLoading(true);
        setCameraError(null);

        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Use the passed deviceId, or fall back to selectedDeviceId
        const targetId = deviceId || selectedDeviceId;

        // Build constraints — use EXACT to guarantee the right device
        const constraints = {
          video: targetId
            ? { deviceId: { exact: targetId } }
            : true,
          audio: false,
        };

        console.log("Connecting to camera:", targetId || "default");

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Show which device we actually got
        const track = stream.getVideoTracks()[0];
        console.log("Connected to:", track?.label);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (targetId) setSelectedDeviceId(targetId);
        setCameraActive(true);
        setLoading(false);
      } catch (err) {
        let msg = "Could not connect.";
        if (err.name === "NotAllowedError") {
          msg =
            "PERMISSION DENIED: Click the LOCK icon in the address bar and set Camera to ALLOW.";
        } else if (err.name === "NotReadableError") {
          msg =
            "CAMERA BUSY: Another app is using this camera. Close Phone Link desktop window, Zoom, or Teams and try again.";
        } else if (err.name === "NotFoundError") {
          msg =
            "DEVICE NOT FOUND: The selected camera is not available.";
        } else if (err.name === "OverconstrainedError") {
          msg =
            "DEVICE UNAVAILABLE: The selected camera could not be opened. It may be disconnected.";
        } else {
          msg = `ERROR: ${err.message}`;
        }

        setCameraError(msg);
        setCameraActive(false);
        setLoading(false);
      }
    },
    [selectedDeviceId]
  );

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

  const switchCamera = useCallback(
    async (deviceId) => {
      setSelectedDeviceId(deviceId);
      if (cameraActive) {
        await startCamera(deviceId);
      }
    },
    [cameraActive, startCamera]
  );

  const toggleMirror = () => setIsMirrored(!isMirrored);

  // Listen for device changes
  useEffect(() => {
    const handleChange = () => enumerateDevices();
    navigator.mediaDevices?.addEventListener("devicechange", handleChange);
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
