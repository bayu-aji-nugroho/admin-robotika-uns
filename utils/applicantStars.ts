import type { SupabaseClient } from "@supabase/supabase-js";

/** Peta applicant_id -> nama admin yang memberi bintang ("Admin" bila tidak diketahui). */
export async function fetchApplicantStars(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data: stars } = await supabase.from("applicant_stars").select("applicant_id, starred_by");
  const rows = (stars || []) as { applicant_id: string; starred_by: string | null }[];
  const adminIds = Array.from(new Set(rows.map((r) => r.starred_by).filter(Boolean))) as string[];
  const { data: admins } = adminIds.length
    ? await supabase.from("admin_whitelist").select("id, full_name, email").in("id", adminIds)
    : { data: [] };
  const nameById = new Map(
    ((admins || []) as { id: string; full_name: string | null; email: string }[]).map((a) => [
      a.id,
      a.full_name || a.email.split("@")[0],
    ])
  );
  return new Map(rows.map((r) => [r.applicant_id, (r.starred_by && nameById.get(r.starred_by)) || "Admin"]));
}
