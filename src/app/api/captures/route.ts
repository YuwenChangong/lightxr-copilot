import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getAuthUserFromRequest } from "@/lib/get-auth-user";

export async function GET(req: Request) {
  try {
    const user = await getAuthUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from("captures")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Fetch captures error:", error);
      return NextResponse.json({ error: "Failed to fetch captures" }, { status: 500 });
    }

    return NextResponse.json({ captures: data });
  } catch (error) {
    console.error("Captures API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}