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
    const { taskName } = body;

    if (!taskName) {
      return NextResponse.json(
        { error: "taskName is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("training_sessions")
      .insert({
        task_name: taskName,
        status: "active",
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Session start error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Session start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}