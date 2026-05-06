"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { registerHandler } from "@/lib/glass-os/action-executor";
import type { AgentAction } from "@/lib/glass-os/gaze-types";

export function DemoCameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<(() => void) | null>(null);
  const toggleFacingRef = useRef<(() => void) | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraAvailable(false);
      setError("摄像头不可用 — 请使用上传按钮选择图片");
    }
  }, [facingMode]);

  // Register action handler for camera voice commands
  useEffect(() => {
    const unsub = registerHandler("camera", (action: AgentAction) => {
      switch (action.type) {
        case "camera_capture":
          captureRef.current?.();
          break;
        case "camera_switch":
          toggleFacingRef.current?.();
          break;
      }
    });
    return unsub;
  }, []);

    // Auto-start camera on mount
    useEffect(() => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraAvailable(false);
        setError("摄像头不可用 — 请使用上传按钮选择图片");
        return;
      }
      startCamera();
      return () => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhoto(dataUrl);
  }, []);

  const toggleFacing = useCallback(() => {
    setFacingMode((f) => (f === "user" ? "environment" : "user"));
  }, []);

  // Keep refs in sync for voice command handler
  captureRef.current = capture;
  toggleFacingRef.current = toggleFacing;

  // Restart camera when facingMode changes
  useEffect(() => {
    startCamera();
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
      {/* Camera viewport */}
      <div style={{
        flex: 1,
        background: "#000",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #1e293b",
      }}>
        {error ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <div style={{ fontSize: 14, color: "#ef4444", marginBottom: 8 }}>{error}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Camera requires HTTPS or localhost.
              <br />
              On mobile, grant camera permission when prompted.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
              {cameraAvailable && (
                <button
                  onClick={startCamera}
                  style={{
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: 10,
                    padding: "8px 20px",
                    color: "#f59e0b",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  🔄 Retry
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: 10,
                  padding: "8px 20px",
                  color: "#3b82f6",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                📷 Upload Photo
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
            }}
          />
        )}

        {/* Viewfinder overlay */}
        {!error && (
          <div style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            border: "2px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
          }}>
            {/* Corner brackets */}
            {[
              { top: 12, left: 12 },
              { top: 12, right: 12 },
              { bottom: 12, left: 12 },
              { bottom: 12, right: 12 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: "absolute",
                ...pos,
                width: 20,
                height: 20,
                borderColor: "rgba(255,255,255,0.3)",
                borderStyle: "solid",
                borderWidth: 0,
                ...(i === 0 ? { borderTopWidth: 2, borderLeftWidth: 2 } : {}),
                ...(i === 1 ? { borderTopWidth: 2, borderRightWidth: 2 } : {}),
                ...(i === 2 ? { borderBottomWidth: 2, borderLeftWidth: 2 } : {}),
                ...(i === 3 ? { borderBottomWidth: 2, borderRightWidth: 2 } : {}),
              }} />
            ))}
          </div>
        )}

        {/* Photo preview */}
        {photo && (
          <div style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            width: 80,
            height: 60,
            borderRadius: 8,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
          }}>
            <img src={photo} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Hidden file input for upload fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          setPhoto(url);
          setError(null);
        }}
      />

      {/* Controls */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}>
        {cameraAvailable && (
          <button onClick={toggleFacing} style={ctrlBtn}>
            🔄 Flip
          </button>
        )}
        <button
          onClick={cameraAvailable ? capture : () => fileInputRef.current?.click()}
          disabled={false}
          style={{
            ...ctrlBtn,
            background: "rgba(245,158,11,0.15)",
            color: "#f59e0b",
            borderColor: "rgba(245,158,11,0.3)",
            padding: "12px 28px",
            fontSize: 18,
            borderRadius: "50%",
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          📸
        </button>
        <button onClick={() => setPhoto(null)} style={ctrlBtn}>
          ✕ Clear
        </button>
        {!cameraAvailable && (
          <button onClick={() => fileInputRef.current?.click()} style={ctrlBtn}>
            📷 Upload
          </button>
        )}
      </div>

      {/* Photo gallery */}
      {photo && (
        <div style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 12,
          padding: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <img src={photo} alt="Last capture" style={{ width: 48, height: 36, borderRadius: 6, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>Photo captured!</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#334155", textAlign: "center" }}>
        � 拍照 · 返回
      </div>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "10px 16px",
  color: "#94a3b8",
  fontSize: 13,
  cursor: "pointer",
};