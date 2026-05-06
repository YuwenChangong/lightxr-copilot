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
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);

  const initCamera = useCallback(async (prevStream?: MediaStream | null) => {
    // Stop previous stream if any
    if (prevStream) {
      prevStream.getTracks().forEach((t) => t.stop());
    }

    try {
      setLoading(true);
      setError(null);

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraSupported(false);
        setLoading(false);
        setError(
          "当前页面无法直接访问摄像头（需要 HTTPS 或 localhost）。请使用下方按钮拍照或上传图片。"
        );
        return null;
      }

    const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
        setCameraSupported(true);
        return stream;
    } catch (err) {
      setLoading(false);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("摄像头权限被拒绝。请点击下方按钮直接拍照或上传图片。");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("未检测到摄像头设备。请点击下方按钮上传图片。");
      } else {
        setError(
          "无法直接访问摄像头（可能需要 HTTPS）。请点击下方按钮拍照或上传图片。"
        );
      }
      setCameraSupported(false);
      return null;
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      stream = await initCamera();
      if (cancelled && stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    })();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initCamera]);

  const handleRetryCamera = useCallback(async () => {
    setCameraSupported(true);
    setError(null);
    await initCamera(streamRef.current);
  }, [initCamera]);

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
      <div className="relative bg-white flex flex-col items-center justify-center p-5 gap-3 min-h-[160px] rounded-2xl mx-3 mt-3" style={{ boxShadow: "0 0 0 1px var(--separator)" }}>
        {error && (
          <div className="bg-[#ff9500]/10 rounded-xl px-3 py-2 mb-1">
            <p className="text-[#ff9500] text-xs text-center leading-relaxed">{error}</p>
          </div>
        )}

        {capturedPreview ? (
          <div className="flex items-center gap-3 w-full">
            <img
              src={capturedPreview}
              alt="Captured"
              className="w-[72px] h-[72px] rounded-xl object-cover"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}
            />
            <div className="flex flex-col gap-2">
              <span className="text-xs text-[#34c759] font-medium">✓ Image ready</span>
              <button
                onClick={() => {
                  setCapturedPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-4 py-1.5 bg-[#f2f2f7] text-[#007aff] text-xs font-medium rounded-lg active:bg-[#e5e5ea] transition-colors"
              >
                Re-upload
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#007aff] text-white text-[15px] font-medium rounded-full active:scale-[0.97] transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
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
    <div className="relative bg-black overflow-hidden mx-3 mt-3 rounded-2xl" style={{ aspectRatio: "4/3", maxHeight: 280 }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-2">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/50 text-xs">Starting camera...</p>
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
            className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/80"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
          />
          <button
            onClick={handleRetake}
            className="px-3.5 py-2 bg-black/50 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/20 active:bg-black/70 transition-colors"
          >
            Retake
          </button>
        </div>
      ) : (
        /* Capture button */
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleCapture}
            className="w-[68px] h-[68px] rounded-full flex items-center justify-center active:scale-[0.92] transition-transform"
            aria-label="Capture"
            style={{
              background: "transparent",
              border: "4px solid white",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <div className="w-[54px] h-[54px] rounded-full bg-white" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)" }} />
          </button>
        </div>
      )}
    </div>
  );
}