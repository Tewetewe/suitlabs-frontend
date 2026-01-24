"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface CameraModalProps {
  isOpen: boolean;
  onCapture: (imageData: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraModal({
  isOpen,
  onCapture,
  onClose,
  title = "Take a Selfie",
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        setError("");
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setHasPermission(true);
        }
      } catch (err) {
        setHasPermission(false);
        const error = err as { name?: string; message?: string };
        let errorMessage = "Failed to access camera";
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Camera permission denied. Please enable camera access.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No camera device found";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Camera is already in use";
        }
        setError(errorMessage);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);

        // Stop stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        onCapture(imageData);
        onClose();
      }
    } catch (err) {
      setError("Failed to capture photo");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>

        <div className="p-4">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {hasPermission === true && (
            <>
              <div className="mb-4 bg-black rounded overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  autoPlay
                  playsInline
                />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-3">
                <Button
                  onClick={handleCapture}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Capture
                </Button>
                <Button
                  onClick={() => {
                    if (stream) {
                      stream.getTracks().forEach((track) => track.stop());
                    }
                    onClose();
                  }}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {hasPermission === false && (
            <div className="text-center py-6">
              <p className="text-gray-700 mb-4">
                Camera permission is required to take a selfie.
              </p>
              <Button
                onClick={onClose}
                className="bg-gray-400 hover:bg-gray-500 text-white"
              >
                Close
              </Button>
            </div>
          )}

          {hasPermission === null && (
            <div className="text-center py-6">
              <p className="text-gray-700">Requesting camera access...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
