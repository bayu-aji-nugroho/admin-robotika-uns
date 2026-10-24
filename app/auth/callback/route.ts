import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const authError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  
  // Perlindungan Host Header Poisoning: validasi domain sebelum menggunakannya sebagai target redirect
  let redirectBase = origin;
  if (!isLocalEnv && forwardedHost) {
    const isAllowed =
      forwardedHost.endsWith(".uns.ac.id") ||
      forwardedHost.endsWith(".vercel.app") ||
      forwardedHost.startsWith("localhost") ||
      forwardedHost.startsWith("127.0.0.1");
    if (isAllowed) {
      redirectBase = `https://${forwardedHost}`;
    }
  }

  // Jika Google atau provider mengembalikan error
  if (authError) {
    const errorRedirect = new URL("/", redirectBase);
    errorRedirect.searchParams.set("error", authError);
    if (errorDescription) {
      errorRedirect.searchParams.set("message", errorDescription);
    }
    return NextResponse.redirect(errorRedirect);
  }

  if (code) {
    const supabase = await createClient();

    // 1. Tukar authorization code dengan session user
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const failRedirect = new URL("/", redirectBase);
      failRedirect.searchParams.set("error", "session_exchange_failed");
      failRedirect.searchParams.set("message", exchangeError.message);
      return NextResponse.redirect(failRedirect);
    }

    // 2. Ambil informasi user yang baru saja login
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      await supabase.auth.signOut();
      const failRedirect = new URL("/", redirectBase);
      failRedirect.searchParams.set("error", "missing_email");
      return NextResponse.redirect(failRedirect);
    }

    const userEmail = user.email.toLowerCase().trim();

    // 3. MEKANISME SERVER: Cek apakah email terdaftar di tabel admin_whitelist & aktif
    const { data: adminRecord, error: dbError } = await supabase
      .from("admin_whitelist")
      .select("id, email, full_name, role_oprec, role_division, is_active")
      .eq("email", userEmail)
      .maybeSingle();

    // 4. PENOLAKAN: Jika email tidak ditemukan atau tidak aktif
    if (dbError || !adminRecord || !adminRecord.is_active) {
      // Putus sesi segera agar tidak ada sisa session di server/cookie
      await supabase.auth.signOut();

      const deniedRedirect = new URL("/", redirectBase);
      deniedRedirect.searchParams.set("error", "unauthorized_email");
      deniedRedirect.searchParams.set("email", userEmail);
      return NextResponse.redirect(deniedRedirect);
    }

    // 5. PENERIMAAN: Email sah & terdaftar
    return NextResponse.redirect(new URL("/dashboard", redirectBase));
  }

  // Jika tidak ada code
  return NextResponse.redirect(new URL("/", redirectBase));
}
