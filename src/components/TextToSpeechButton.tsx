"use client";

import { useState, useCallback, useEffect } from "react";

interface TextToSpeechButtonProps {
  text: string;
  lang?: string;
}

export default function TextToSpeechButton({
  text,
  lang = "zh-CN",
}: TextToSpeechButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!window.speechSynthesis) {
      setSupported(false);
    }
  }, []);

  // Stop on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleSpeech = useCallback(() => {
    if (!window.speechSynthesis) {
      setSupported(false);
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [text, lang, speaking]);

  if (!supported) {
    return null;
  }

  return (
    <button
      onClick={toggleSpeech}
      className={`p-1.5 rounded-md transition-colors ${
        speaking
          ? "bg-blue-600 text-white"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      }`}
      title={speaking ? "停止播放" : "播放语音"}
    >
      {speaking ? (
        // Stop icon
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        // Speaker icon
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
        </svg>
      )}
    </button>
  );
}