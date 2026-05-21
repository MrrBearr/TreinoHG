import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root entry — checks the user's auth state and redirects accordingly.
 * Reads cookies, so it MUST be dynamic.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  redirect("/login");
}
