"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAnonymousUser } from "@/hooks/useAnonymousUser";
import TextToSpeechButton from "@/components/TextToSpeechButton";
import VoiceInputButton from "@/components/VoiceInputButton";

type GlassState = "idle" | "listening" | "capturing" | "analyzing" | "speaking" | "done";

export default function GlassPage() {
  const { userId, accessToken } = useAnonymousUser();
  const [state, setState] = useState<GlassState>("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privateMode, setPrivateMode] = useState(false);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera on mount
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setCameraSupported(false);
      }
    }
    initCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const captureFrame = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) {
        resolve(null);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((b) => { resolve(b); }, "image/jpeg", 0.85);
    });
  }, []);

  const startVoiceRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("此浏览器不支持语音识别，请使用文本输入。");
      return;
    }

    const recognition = new SR();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setQuestion((finalText + interim).trim());
    };

    recognition.onend = () => {
      const q = finalText.trim();
      if (q) {
        recognitionRef.current = null;
        handleAsk(q);
      } else {
        setState("idle");
        recognitionRef.current = null;
      }
    };

    recognition.onerror = (event: any) => {
      setState("idle");
      recognitionRef.current = null;
      if (event.error === "not-allowed") {
        setError("麦克风权限被拒绝，请允许麦克风访问。");
      } else {
        setError("语音识别失败，请重试或使用文本输入。");
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const handleAsk = useCallback(async (q: string) => {
    setState("capturing");
    setError(null);
    setAnswer("");
    setImageUrl(null);

    // Capture frame
    const blob = await captureFrame();
    if (!blob) {
      setState("idle");
      setError("摄像头不可用，请使用下方按钮上传图片。");
      return;
    }

    const previewUrl = URL.createObjectURL(blob);
    setImageUrl(previewUrl);

    // Upload and analyze
    setState("analyzing");

    try {
      const fd = new FormData();
      fd.append("image", blob, "capture.jpg");
      fd.append("question", q);
      fd.append("mode", "quick");
      if (userId) fd.append("user_id", userId);
      if (privateMode) fd.append("private", "true");

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setAnswer(data.answer || "No answer received.");
      setState("done");
    } catch (err: any) {
      setError(err.message || "Request failed.");
      setState("idle");
    }
  }, [captureFrame, userId, accessToken, privateMode]);

  // Handle file upload as fallback when camera is unavailable
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setState("analyzing");
      setError(null);
      setAnswer("");
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);

      try {
        const fd = new FormData();
        fd.append("image", file, "capture.jpg");
        fd.append("question", question.trim() || "请描述这个画面，识别图中的物体，并告诉我下一步该做什么");
        fd.append("mode", "quick");
        if (userId) fd.append("user_id", userId);
        if (privateMode) fd.append("private", "true");

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: fd,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server error ${res.status}`);
        }

        const data = await res.json();
        setAnswer(data.answer || "No answer received.");
        setState("done");
      } catch (err: any) {
        setError(err.message || "Request failed.");
        setState("idle");
      }
    },
    [question, userId, accessToken, privateMode]
  );

  // Tap = start voice
  const handleTap = useCallback(() => {
    if (state !== "idle" && state !== "done") return;
    setError(null);
    setQuestion("");
    setAnswer("");
    setImageUrl(null);
    setState("listening");
    startVoiceRecognition();
  }, [state, startVoiceRecognition]);

  // Hold = text mode (type question)
  const handleHoldStart = useCallback(() => {
    const timer = setTimeout(() => {
      // Long press detected - show text input
      const q = prompt("输入你的问题:");
      if (q?.trim()) {
        setQuestion(q.trim());
        handleAsk(q.trim());
      }
    }, 800);
    setHoldTimer(timer);
  }, [handleAsk]);

  const handleHoldEnd = useCallback(() => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  }, [holdTimer]);

  const handleReset = useCallback(() => {
    setState("idle");
    setQuestion("");
    setAnswer("");
    setImageUrl(null);
    setError(null);
  }, []);

  const stateLabel = {
    idle: "点击说话",
    listening: "正在听...",
    capturing: "拍摄中...",
    analyzing: "思考中...",
    speaking: "回答中...",
    done: "点击再次提问",
  }[state];

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#000",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Private mode toggle */}
      <div style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 100,
      }}>
        <button
          onClick={() => setPrivateMode(!privateMode)}
          style={{
            background: privateMode ? "#ef4444" : "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: "6px 14px",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {privateMode ? "🔒 Private" : "🔓 Normal"}
        </button>
      </div>

      {/* Back button */}
      <a
        href="/"
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          color: "#666",
          textDecoration: "none",
          fontSize: 13,
          zIndex: 100,
        }}
      >
        ← Home
      </a>

      {/* Camera preview / captured image */}
      <div style={{
        width: "100%",
        maxWidth: 400,
        aspectRatio: "4/3",
        borderRadius: 24,
        overflow: "hidden",
        background: "#111",
        position: "relative",
        marginBottom: 24,
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: state === "analyzing" || state === "done" ? 0.3 : 1,
            transition: "opacity 0.3s",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {imageUrl && (state === "analyzing" || state === "done") && (
          <img
            src={imageUrl}
            alt="Captured"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* State overlay */}
        {state !== "idle" && state !== "done" && (
          <div style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(10px)",
            borderRadius: 20,
            padding: "8px 20px",
            fontSize: 14,
            fontWeight: 600,
          }}>
            {state === "listening" && "🎤 "}
            {state === "capturing" && "📸 "}
            {state === "analyzing" && "🧠 "}
            {stateLabel}
          </div>
        )}
      </div>

      {/* Main action button */}
      <button
        onClick={handleTap}
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
        disabled={state === "listening" || state === "capturing" || state === "analyzing"}
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: `3px solid ${state === "analyzing" ? "#f59e0b" : state === "listening" ? "#22c55e" : "#fff"}`,
          background: state === "listening" ? "rgba(34,197,94,0.2)" : "transparent",
          cursor: state === "idle" || state === "done" ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          transition: "all 0.3s",
        }}
      >
        <div style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: state === "analyzing" ? "#f59e0b" : state === "listening" ? "#22c55e" : "#fff",
          transition: "all 0.3s",
        }} />
      </button>

      {/* Status text */}
      <p style={{
        fontSize: 15,
        color: "#888",
        marginBottom: 16,
        textAlign: "center",
      }}>
        {stateLabel}
        {privateMode && state === "idle" && " • 🔒 Won't save"}
      </p>

      {/* Question asked */}
      {question && (
        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: "12px 20px",
          maxWidth: 400,
          width: "100%",
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 11, color: "#666", margin: "0 0 4px" }}>You asked:</p>
          <p style={{ fontSize: 14, color: "#e2e8f0", margin: 0 }}>{question}</p>
        </div>
      )}

      {/* AI Answer */}
      {answer && (
        <div style={{
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 16,
          padding: "12px 20px",
          maxWidth: 400,
          width: "100%",
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 11, color: "#3b82f6", margin: "0 0 4px" }}>Gaze AI:</p>
          <p style={{ fontSize: 14, color: "#e2e8f0", margin: 0, lineHeight: 1.5 }}>{answer}</p>
          <div style={{ marginTop: 8 }}>
            <TextToSpeechButton text={answer} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          borderRadius: 12,
          padding: "10px 16px",
          maxWidth: 400,
          width: "100%",
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* File upload fallback when camera is not supported */}
      {!cameraSupported && state === "idle" && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 12,
              padding: "10px 24px",
              color: "#3b82f6",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            📷 上传图片提问
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* Text input for questions */}
      <div style={{
        display: "flex",
        gap: 8,
        maxWidth: 400,
        width: "100%",
        marginBottom: 12,
      }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && question.trim()) {
              if (cameraSupported) {
                handleAsk(question.trim());
              } else {
                fileInputRef.current?.click();
              }
            }
          }}
          placeholder="输入问题..."
          disabled={state !== "idle" && state !== "done"}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: "10px 16px",
            color: "#fff",
            fontSize: 14,
            outline: "none",
            opacity: (state !== "idle" && state !== "done") ? 0.5 : 1,
          }}
        />
        <VoiceInputButton
          onResult={(text) => setQuestion(text)}
          lang="zh-CN"
          disabled={state !== "idle" && state !== "done"}
        />
      </div>

      {/* Reset button when done */}
      {state === "done" && (
        <button
          onClick={handleReset}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: "10px 24px",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          新问题
        </button>
      )}
    </div>
  );
}