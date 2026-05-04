import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // 1. Get all captures for this session
    const { data: captures, error: capturesError } = await supabaseServer
      .from("captures")
      .select("question, answer, image_url, created_at, task_name, step_index")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (capturesError) {
      console.error("Fetch captures error:", capturesError);
      return NextResponse.json(
        { error: "Failed to fetch captures" },
        { status: 500 }
      );
    }

    const totalQuestions = captures?.length || 0;

    // 2. Generate report using MiMo V2 Flash
    let report = "No captures found for this session.";

    if (captures && captures.length > 0) {
      const apiKey = process.env.AI_API_KEY;
      const apiBaseUrl = process.env.AI_API_BASE_URL || "https://api.openai.com/v1";

      if (apiKey) {
        try {
          const urlObj = new URL(apiBaseUrl);
          const apiUrl = `${urlObj.origin}/v1/chat/completions`;

          const conversationSummary = captures
            .map(
              (c, i) =>
                `[第${i + 1}次提问] ${c.task_name ? `任务: ${c.task_name}` : ""}${c.step_index !== null ? `, 步骤: ${c.step_index + 1}` : ""}
问题: ${c.question}
回答: ${c.answer}`
            )
            .join("\n\n");

          const aiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "MiMo-V2-Flash",
              messages: [
                {
                  role: "user",
                  content: `你是一个工业培训评估专家。请根据以下训练记录生成一份简洁的中文训练报告。

训练记录（共 ${totalQuestions} 次提问）：

${conversationSummary}

请按以下格式生成报告：

## 训练总结

**提问总数**：${totalQuestions} 次

**训练概述**：（简要总结训练内容和过程）

**掌握情况**：（评估用户对任务的理解程度）

**改进建议**：（1-3条具体建议）

**总体评价**：（一句话总结）

要求：
- 用中文
- 简洁明了，不超过 300 字
- 基于实际问答内容评估
- 给出具体可操作的建议`,
                },
              ],
              max_tokens: 500,
              temperature: 0.3,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            report = aiData.choices?.[0]?.message?.content || report;
          } else {
            const errorText = await aiResponse.text();
            console.error("AI report generation error:", aiResponse.status, errorText);
          }
        } catch (error) {
          console.error("AI report request failed:", error);
        }
      }
    }

    // 3. Update the session
    const { data: session, error: updateError } = await supabaseServer
      .from("training_sessions")
      .update({
        completed_at: new Date().toISOString(),
        status: "completed",
        report,
        total_questions: totalQuestions,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      console.error("Session update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session, report });
  } catch (error) {
    console.error("Session complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}