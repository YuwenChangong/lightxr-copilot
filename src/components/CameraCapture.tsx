"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface CaptureResult {
  blob: Blob;
  previewUrl: string;
}

interface CameraCaptureProps {
  onCapture: (result: CaptureResult) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        setLoading(true);

        if (
          typeof navigator === "undefined" ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          setCameraSupported(false);
          setLoading(false);
          setError(
            "Camera API is unavailable. This page must be served over HTTPS (or localhost) to access the camera. You can upload a photo instead."
          );
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
      } catch (err) {
        setLoading(false);
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access and refresh.");
        } else if (err instanceof DOMException && err.name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError(
            "Failed to access camera. Make sure you are on HTTPS or localhost. You can upload a photo instead."
          );
        }
        setCameraSupported(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Compress image to reduce size for upload
  const compressImage = useCallback((blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const c = document.createElement("canvas");
        const maxSize = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round((h / w) * maxSize);
            w = maxSize;
          } else {
            w = Math.round((w / h) * maxSize);
            h = maxSize;
          }
        }
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) { resolve(blob); return; }
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(
          (compressed) => resolve(compressed || blob),
          "image/jpeg",
          0.7
        );
      };
      img.src = url;
    });
  }, []);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const compressed = await compressImage(blob);
        const previewUrl = URL.createObjectURL(compressed);
        setCapturedPreview(previewUrl);
        onCapture({ blob: compressed, previewUrl });
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, compressImage]);

  const handleRetake = useCallback(() => {
    setCapturedPreview(null);
  }, []);

  // Handle file upload as fallback when camera is unavailable
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      setCapturedPreview(previewUrl);
      onCapture({ blob: compressed, previewUrl });
    },
    [onCapture, compressImage]
  );

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [capturedPreview]);

  // Show file upload UI when camera is not supported
  if (!cameraSupported) {
    return (
      <div className="relative bg-zinc-900 flex flex-col items-center justify-center p-4 gap-3 min-h-[140px]">
        {error && <p className="text-amber-400 text-xs max-w-sm text-center">{error}</p>}

        {capturedPreview ? (
          <div className="flex items-center gap-3 w-full">
            <img
              src={capturedPreview}
              alt="Captured"
              className="w-20 h-20 rounded-lg object-cover border border-zinc-700"
            />
            <div className="flex flex-col gap-2">
              <span className="text-xs text-green-400">✓ Image ready</span>
              <button
                onClick={() => {
                  setCapturedPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-3 py-1.5 bg-zinc-700 text-white text-xs rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Re-upload
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors"
          >
            Upload Photo
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="relative bg-black h-[240px] shrink-0">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <p className="text-zinc-500 text-sm">Starting camera...</p>
        </div>
      )}

      {/* Live camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {capturedPreview ? (
        /* After capture: show thumbnail + retake, camera stays visible */
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
          <img
            src={capturedPreview}
            alt="Captured"
            className="w-16 h-16 rounded-md object-cover border-2 border-green-400"
          />
          <button
            onClick={handleRetake}
            className="px-3 py-1.5 bg-zinc-800/80 backdrop-blur text-white text-xs rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-600"
          >
            Retake
          </button>
        </div>
      ) : (
        /* Capture button */
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleCapture}
            className="w-14 h-14 rounded-full bg-white/20 border-4 border-white backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Capture"
          >
            <div className="w-10 h-10 rounded-full bg-white" />
          </button>
        </div>
      )}
    </div>
  );
}