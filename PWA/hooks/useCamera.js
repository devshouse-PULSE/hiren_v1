/**
 * useCamera — Rear camera frame capture at 2fps
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from 'expo-camera';

const FRAME_INTERVAL_MS = 1200; // Increased delay to prevent native memory exhaustion crashes
const FRAME_QUALITY = 0.5; // lower quality for faster base64 encoding

export function useCamera({ onFrame, enabled = false }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const cameraRef = useRef(null);
  const frameTimer = useRef(null);
  const isCaptureActive = useRef(false);

  useEffect(() => {
    async function requestPermission() {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    }
    requestPermission();
  }, []);

  useEffect(() => {
    if (enabled && isReady && hasPermission) startCapture();
    else stopCapture();
    return () => stopCapture();
  }, [enabled, isReady, hasPermission]);

  function startCapture() {
    if (isCaptureActive.current) return;
    isCaptureActive.current = true;

    async function captureLoop() {
      if (!isCaptureActive.current || !cameraRef.current) return;

      try {
        // Safe capture settings to prevent Expo Go from crashing on Android Camera2 API
        const photo = await cameraRef.current.takePictureAsync({
          quality: FRAME_QUALITY,
          base64: true,
          skipProcessing: true,
          exif: false,
          shutterSound: false, // Prevents annoying clicking
          width: 640,
        });

        if (photo?.base64 && onFrameRef.current) {
          onFrameRef.current({
            type: 'CAMERA',
            timestamp: Date.now(),
            image: photo.base64,
            width: photo.width,
            height: photo.height
          });
        }
      } catch (e) {
        console.warn('Camera capture loop error:', e);
      }

      if (isCaptureActive.current) {
        frameTimer.current = setTimeout(captureLoop, FRAME_INTERVAL_MS);
      }
    }

    captureLoop();
  }

  function stopCapture() {
    isCaptureActive.current = false;
    if (frameTimer.current) {
      clearTimeout(frameTimer.current);
      frameTimer.current = null;
    }
  }

  const handleCameraReady = useCallback(() => setIsReady(true), []);

  return {
    hasPermission,
    isReady,
    cameraRef,
    handleCameraReady,
    isActive: enabled && isReady && hasPermission,
  };
}