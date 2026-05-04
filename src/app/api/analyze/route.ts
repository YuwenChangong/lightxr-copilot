import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const question = formData.get("question") as string | null;
    const taskName = formData.get("taskName") as string | null;
    const stepIndex = formData.get("stepIndex") as string | null;
    const stepTitle = formData.get("stepTitle") as string | null;
    const stepInstruction = formData.get("stepInstruction") as string | null;
    const successCriteria = formData.get("successCriteria") as string | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: "No question provided" },
        { status: 400 }
      );
    }

    // Validate image size (max 3MB)
    if (image.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { error: "图片过大，请上传 3MB 以内的图片" },
        { status: 400 }
      );
    }

    // Validate image type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "不支持的图片格式，请上传 JPEG、PNG 或 WebP 格式" },
        { status: 400 }
      );
    }

    // Step 1: AI analysis
    const apiKey = process.env.AI_API_KEY;
    const apiBaseUrl = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";
    const apiModel = process.env.AI_MODEL || "gpt-4o";
    let answer = "Unable to analyze the image.";

    if (apiKey) {
      try {
        const arrayBuffer = await image.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:${image.type};base64,${base64}`;

        // Build the correct API URL from the base URL
        // Extract just the origin (protocol + host) and append /v1/chat/completions
        const urlObj = new URL(apiBaseUrl);
        const apiUrl = `${urlObj.origin}/v1/chat/completions`;

        console.log("AI API request URL:", apiUrl, "model:", apiModel);

        const aiResponse = await fetch(
          apiUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: apiModel,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "image_url", image_url: { url: dataUrl } },
                    {
                      type: "text",
                      text: taskName
                        ? `你是 LightXR Copilot，一个第一视角 AI 眼镜任务助手。

你会收到：
1. 用户第一视角图片
2. 用户问题
3. 当前任务：${taskName}
4. 当前步骤：Step ${Number(stepIndex ?? 0) + 1} - ${stepTitle}
5. 步骤指导：${stepInstruction}
6. 完成标准：${successCriteria}

你的任务：
- 根据图片和当前步骤判断用户是否接近完成当前步骤
- 回答要短，优先给下一步操作建议
- 如果图片无法判断，要明确说"不确定"，并告诉用户应该检查什么
- 不要编造图片里看不到的内容
- 不要跳过当前步骤去讲后面的步骤

输出格式：
状态：完成 / 未完成 / 不确定
建议：一句具体建议
原因：一句简短原因

用户问题：${question}`
                        : `你是一个工业培训助手。用户正在通过摄像头拍摄实物场景，你看到的就是他们面前的真实环境。

你的任务：
1. 识别图中的物体、工具、零件、设备
2. 判断用户当前可能在做什么任务
3. 给出具体、可操作的指导

回答要求：
- 用中文回答
- 不超过 3-4 句话
- 如果看到具体的零件或工具，直接指出来
- 如果能判断步骤，明确告诉用户下一步做什么

用户问题：${question}`,
                    },
                  ],
                },
              ],
              max_tokens: 300,
              temperature: 0.2,
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          answer = aiData.choices?.[0]?.message?.content || answer;
        } else {
          const errorText = await aiResponse.text();
          console.error("AI API error:", aiResponse.status, errorText);
        }
      } catch (error) {
        console.error("AI request failed:", error);
      }
    }

    // Step 2: Upload image to Supabase Storage
    let imageUrl: string | null = null;
    try {
      const imageBuffer = Buffer.from(await image.arrayBuffer());
      const fileExt = image.type.split("/")[1] || "jpg";
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `captures/${fileName}`;

      const { error: uploadError } = await supabaseServer.storage
        .from("captures")
        .upload(filePath, imageBuffer, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      } else {
        const { data: publicUrlData } = supabaseServer.storage
          .from("captures")
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }
    } catch (error) {
      console.error("Image upload failed:", error);
    }

    // Step 3: Insert capture record into database
    let captureRecord = null;
    try {
      const { data, error: insertError } = await supabaseServer
        .from("captures")
        .insert({
          image_url: imageUrl,
          question,
          answer,
          task_name: taskName || null,
          step_index: stepIndex ? Number(stepIndex) : null,
          session_id: sessionId || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Database insert error:", insertError);
      } else {
        captureRecord = data;
      }
    } catch (error) {
      console.error("Database operation failed:", error);
    }

    return NextResponse.json({
      answer,
      capture: captureRecord,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}