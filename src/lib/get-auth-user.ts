import { supabaseServer } from "@/lib/supabase-server";

export async function getAuthUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabaseServer.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}