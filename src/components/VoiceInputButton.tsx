"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  lang?: string;
  disabled?: boolean;
}

/**
 * Voice input using the browser's Web Speech API (SpeechRecognition).
 * Supports Chinese (zh-CN) natively — no server-side transcription needed.
 * Falls back to MediaRecorder + server API if Web Speech API is unavailable.
 */
export default function VoiceInputButton({
  onResult,
  lang = "zh-CN",
  disabled = false,
}: VoiceInputButtonProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "error">("idle");
  const statusRef = useRef<"idle" | "recording" | "processing" | "error">("idle");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // MediaRecorder fallback refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check for Web Speech API support
  const hasSpeechAPI = typeof window !== "undefined" && (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );

  useEffect(() => {
    if (!hasSpeechAPI && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      setSupported(false);
    }
  }, [hasSpeechAPI]);

  // --- Web Speech API path ---
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    let finalTranscript = "";

    recognition.onstart = () => {
      setStatus("recording");
      statusRef.current = "recording";
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      // Use the latest interim result for display but only finalize on end
      if (finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setStatus("error");
        statusRef.current = "error";
      } else if (event.error === "no-speech") {
        setStatus("idle");
        statusRef.current = "idle";
      } else {
        setStatus("error");
        statusRef.current = "error";
      }
      setTimeout(() => { setStatus("idle"); statusRef.current = "idle"; }, 2000);
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        onResult(finalTranscript.trim());
      }
      if (statusRef.current === "recording") {
        setStatus("idle");
        statusRef.current = "idle";
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, [lang, onResult]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // --- MediaRecorder fallback path ---
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecordingFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setStatus("processing");
        const rawBlob = new Blob(chunksRef.current, { type: mimeType });

        try {
          const arrayBuffer = await rawBlob.arrayBuffer();
          const audioCtx = new AudioContext();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const wavBlob = audioBufferToWav(audioBuffer);
          audioCtx.close();

          const formData = new FormData();
          formData.append("audio", wavBlob, "recording.wav");

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (res.ok && data.text) {
            onResult(data.text.trim());
            setStatus("idle");
          } else {
            console.error("Transcription failed:", data.error);
            setStatus("error");
            setTimeout(() => setStatus("idle"), 2000);
          }
        } catch (err) {
          console.error("Transcription request failed:", err);
          setStatus("error");
          setTimeout(() => setStatus("idle"), 2000);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Microphone access denied:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [onResult]);

  const toggleRecording = useCallback(() => {
    if (statusRef.current === "recording") {
      if (hasSpeechAPI) {
        stopSpeechRecognition();
      } else {
        stopRecording();
      }
    } else if (status === "idle") {
      if (hasSpeechAPI) {
        startSpeechRecognition();
      } else {
        startRecordingFallback();
      }
    }
  }, [hasSpeechAPI, stopSpeechRecognition, startSpeechRecognition, stopRecording, startRecordingFallback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (!supported) {
    return (
      <button
        disabled
        className="p-2 text-zinc-600 cursor-not-allowed"
        title="浏览器不支持语音输入"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth={2} />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={toggleRecording}
      disabled={disabled || status === "processing"}
      className={`p-2 rounded-lg transition-colors ${
        status === "recording"
          ? "bg-red-500 text-white animate-pulse"
          : status === "processing"
          ? "bg-yellow-600 text-white animate-pulse"
          : status === "error"
          ? "bg-red-800 text-red-200"
          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={
        status === "recording"
          ? "点击停止录音并识别"
          : status === "processing"
          ? "正在识别语音..."
          : "点击开始录音"
      }
    >
      {status === "recording" ? (
        // Stop icon (square)
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : status === "processing" ? (
        // Spinner icon
        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : status === "error" ? (
        // Error icon
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        // Microphone icon
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )}
    </button>
  );
}

// Convert AudioBuffer to WAV Blob (used by fallback only)
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write audio data
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Extend Window type for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
