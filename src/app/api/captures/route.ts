import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("captures")
      .select("*")
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
