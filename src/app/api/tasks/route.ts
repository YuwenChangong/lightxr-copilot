import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getAuthUserFromRequest } from "@/lib/get-auth-user";

// GET: list all task templates for current user (with steps)
export async function GET(req: Request) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from("task_templates")
      .select("*, task_steps(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch tasks error:", error);
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }

    // Sort steps within each task by step_order
    const tasks = (data || []).map((t) => ({
      ...t,
      task_steps: (t.task_steps || []).sort(
        (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
      ),
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Tasks API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create a new task template with steps
export async function POST(req: Request) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, steps } = body as {
      name: string;
      description?: string;
      steps: { title: string; instruction: string; successCriteria: string }[];
    };

    if (!name || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: "Task name and at least one step are required" },
        { status: 400 }
      );
    }

    // Insert task template
    const { data: task, error: taskError } = await supabaseServer
      .from("task_templates")
      .insert({ name, description: description || null, user_id: user.id })
      .select()
      .single();

    if (taskError) {
      console.error("Create task error:", taskError);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    // Insert steps
    const stepsToInsert = steps.map((s, i) => ({
      task_id: task.id,
      step_order: i + 1,
      title: s.title,
      instruction: s.instruction,
      success_criteria: s.successCriteria,
    }));

    const { data: insertedSteps, error: stepsError } = await supabaseServer
      .from("task_steps")
      .insert(stepsToInsert)
      .select();

    if (stepsError) {
      console.error("Create steps error:", stepsError);
      return NextResponse.json({ error: "Failed to create steps" }, { status: 500 });
    }

    return NextResponse.json({ task: { ...task, task_steps: insertedSteps } }, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}