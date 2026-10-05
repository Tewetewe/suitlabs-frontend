"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import SimpleModal from "@/components/modals/SimpleModal";

interface CameraModalProps {
  isOpen: boolean;
  onCapture: (imageData: string) => void;
  onClose: () => void;
  title?: string;
  facingMode?: "user" | "environment";
}

export default function CameraModal({
  isOpen,
  onCapture,
  onClose,
  title = "Take photo",
  facingMode = "environment",
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setHasPermission(null);
      setError("");
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        setError("");
        setHasPermission(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        setHasPermission(true);
      } catch (err) {
        if (cancelled) return;
        setHasPermission(false);
        const cameraError = err as { name?: string };
        let errorMessage = "Failed to access camera";
        if (cameraError.name === "NotAllowedError") {
          errorMessage = "Camera permission denied. Please enable camera access.";
        } else if (cameraError.name === "NotFoundError") {
          errorMessage = "No camera device found";
        } else if (cameraError.name === "NotReadableError") {
          errorMessage = "Camera is already in use";
        }
        setError(errorMessage);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    if (hasPermission !== true || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
  }, [hasPermission]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Failed to capture photo");
        return;
      }
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.85);
      stopStream();
      onCapture(imageData);
      onClose();
    } catch {
      setError("Failed to capture photo");
    }
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      title={title}
      onClose={handleClose}
      size="md"
      nested
      footer={
        hasPermission === true ? (
          <>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleCapture}>Capture</Button>
          </>
        ) : hasPermission === false ? (
          <Button variant="ghost" onClick={handleClose}>Close</Button>
        ) : undefined
      }
    >
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {hasPermission === true && (
        <>
          <div className="overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-auto w-full" autoPlay playsInline muted />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {hasPermission === false && (
        <p className="py-4 text-center text-sm text-slate-600">
          Camera permission is required to take a photo. You can attach a file instead.
        </p>
      )}

      {hasPermission === null && (
        <p className="py-4 text-center text-sm text-slate-600">Requesting camera access...</p>
      )}
    </SimpleModal>
  );
}
