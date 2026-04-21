import { useState, useRef, useCallback } from 'react';

export const useSerial = (onData) => {
  const [serialConnected, setSerialConnected] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [serialError, setSerialError] = useState(null);
  const portRef = useRef(null);
  const readerRef = useRef(null);

  const disconnectSerial = useCallback(async () => {
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }
    if (portRef.current) {
      await portRef.current.close();
      portRef.current = null;
    }
    setSerialConnected(false);
  }, []);

  const connectSerial = useCallback(async () => {
    if (!("serial" in navigator)) {
      setSerialError("Web Serial is NOT supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      setSerialError(null);
      // Prompt user to select COM port (e.g., COM5)
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setSerialConnected(true);

      // Start reading stream
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      console.log("✓ Serial Connected (COM)");

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop(); // Keep partial last line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Robust JSON extraction: Find the first { and the last } in the line
            const firstBrace = trimmed.indexOf('{');
            const lastBrace = trimmed.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const jsonCandidate = trimmed.substring(firstBrace, lastBrace + 1);
              try {
                const parsed = JSON.parse(jsonCandidate);
                setReceiving(true);
                onData(parsed);
              } catch (e) {
                // Not valid JSON inside the braces, ignore
              }
            } else {
              // This is likely a debug message or booting string (e.g. "WiFi connected")
              console.log("Serial Debug:", trimmed);
            }
          }
        }
      }
    } catch (err) {
      console.error("Serial connection error:", err);
      if (err.name !== "NotFoundError") {
        setSerialError(err.message);
      }
      setSerialConnected(false);
    }
  }, [onData]);

  const sendSerialCommand = useCallback(async (command) => {
    if (!portRef.current || !portRef.current.writable) return;
    const encoder = new TextEncoder();
    const writer = portRef.current.writable.getWriter();
    await writer.write(encoder.encode(command + "\n"));
    writer.releaseLock();
    console.log("⟶ Serial Command Sent:", command);
  }, []);

  return {
    serialConnected,
    receiving,
    serialError,
    connectSerial,
    disconnectSerial,
    sendSerialCommand
  };
};
