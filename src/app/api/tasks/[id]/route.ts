import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getAuthUserFromRequest } from "@/lib/get-auth-user";

// GET: fetch a single task with steps
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: task, error } = await supabaseServer
      .from("task_templates")
      .select("*, task_steps(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Sort steps by step_order
    task.task_steps = (task.task_steps || []).sort(
      (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
    );

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Task GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: update a task template and its steps
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseServer
      .from("task_templates")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
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

    // Update task template
    const { error: updateError } = await supabaseServer
      .from("task_templates")
      .update({ name, description: description || null })
      .eq("id", id);

    if (updateError) {
      console.error("Update task error:", updateError);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    // Delete existing steps (cascade should handle this, but be explicit)
    await supabaseServer.from("task_steps").delete().eq("task_id", id);

    // Insert new steps
    const stepsToInsert = steps.map((s, i) => ({
      task_id: id,
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
      console.error("Update steps error:", stepsError);
      return NextResponse.json({ error: "Failed to update steps" }, { status: 500 });
    }

    return NextResponse.json({ task: { id, name, description, task_steps: insertedSteps } });
  } catch (error) {
    console.error("Task PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: delete a task template (cascades to steps)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseServer
      .from("task_templates")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseServer
      .from("task_templates")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete task error:", deleteError);
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}