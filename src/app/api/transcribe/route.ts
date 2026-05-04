import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json(
        { error: "No audio provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.AI_API_KEY;
    const apiBaseUrl = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI API key not configured" },
        { status: 500 }
      );
    }

    // Extract origin from base URL
    const urlObj = new URL(apiBaseUrl);

    // Try OpenAI-compatible whisper endpoint first
    const whisperUrl = `${urlObj.origin}/v1/audio/transcriptions`;

    const whisperFormData = new FormData();
    const fileName = audio.name || "audio.wav";
    whisperFormData.append("file", audio, fileName);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "zh");
    whisperFormData.append("response_format", "json");

    try {
      const whisperResponse = await fetch(whisperUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperFormData,
      });

      if (whisperResponse.ok) {
        const data = await whisperResponse.json();
        return NextResponse.json({ text: data.text || "" });
      }

      // If whisper endpoint fails, fall back to omni model with audio
      console.log("Whisper endpoint not available, trying omni model...");
    } catch (e) {
      console.log("Whisper endpoint error:", e);
    }

    // Fallback: encode audio as base64 and send to omni model
    const arrayBuffer = await audio.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const chatUrl = `${urlObj.origin}/v1/chat/completions`;

    const chatResponse = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "mimo-v2-omni",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: base64,
                  format: audio.type.includes("webm") ? "webm" : "wav",
                },
              },
              {
                type: "text",
                text: "请将上面的语音内容转录为文字，只输出转录的文字，不要添加任何其他内容。",
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0,
      }),
    });

    if (chatResponse.ok) {
      const data = await chatResponse.json();
      const text = data.choices?.[0]?.message?.content || "";
      return NextResponse.json({ text });
    }

    const errorText = await chatResponse.text();
    console.error("Transcription API error:", chatResponse.status, errorText);
    return NextResponse.json(
      { error: "Transcription failed", details: errorText },
      { status: chatResponse.status }
    );
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}