import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getAuthUserFromRequest } from "@/lib/get-auth-user";

export async function POST(req: Request) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Verify that this session belongs to the current user
    const { data: existingSession, error: sessionCheckError } =
      await supabaseServer
        .from("training_sessions")
        .select("user_id")
        .eq("id", sessionId)
        .single();

    if (sessionCheckError || !existingSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (existingSession.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Get all captures for this session (only this user's)
    const { data: captures, error: capturesError } = await supabaseServer
      .from("captures")
      .select(
        "question, answer, image_url, created_at, task_name, step_index, session_id"
      )
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (capturesError) {
      console.error("Fetch captures error:", capturesError);
      return NextResponse.json(
        { error: "Failed to fetch captures" },
        { status: 500 }
      );
    }

    const totalQuestions = captures?.length || 0;

    // 2. Generate report using AI
    let report = "No captures found for this session. No AI report generated.";

    if (captures && captures.length > 0) {
      const apiKey = process.env.AI_API_KEY;
      const apiBaseUrl =
        process.env.AI_API_BASE_URL || "https://api.openai.com/v1";

      if (apiKey) {
        try {
          const urlObj = new URL(apiBaseUrl);
          const apiUrl = `${urlObj.origin}/v1/chat/completions`;

          const conversationSummary = captures
            .map(
              (c, i) =>
                `[第${i + 1}次提问] ${c.task_name ? `任务: ${c.task_name}` : ""}${
                  c.step_index !== null ? `, 步骤: ${c.step_index + 1}` : ""
                }\n问题: ${c.question}\n回答: ${c.answer}`
            )
            .join("\n\n");

          const aiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: process.env.AI_MODEL || "gpt-4o",
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
              max_tokens: 1500,
              temperature: 0.3,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            report = aiData.choices?.[0]?.message?.content || report;
          } else {
            const errorText = await aiResponse.text();
            console.error(
              "AI report generation error:",
              aiResponse.status,
              errorText
            );
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
      .eq("user_id", user.id)
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