import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in middleware."
    );
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isDashboardRoute =
      pathname.startsWith("/dashboard") || pathname.startsWith("/dasbord");

    // 1. Proteksi Satu Pintu: Dashboard hanya untuk user aktif yang terdaftar di whitelist
    if (isDashboardRoute) {
      if (!user || !user.email) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      const { data: adminRecord } = await supabase
        .from("admin_whitelist")
        .select("id, is_active")
        .eq("email", user.email.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (!adminRecord) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "unauthorized_email");
        url.searchParams.set("email", user.email);
        return NextResponse.redirect(url);
      }
    }

    // 2. Jika user sudah login dan mengakses '/', alihkan langsung ke '/dashboard' bila aktif di whitelist
    if (pathname === "/" && user && user.email) {
      const { data: adminRecord } = await supabase
        .from("admin_whitelist")
        .select("id, is_active")
        .eq("email", user.email.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (adminRecord) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      } else {
        // Bersihkan sesi yang tidak berizin jika mengunjungi beranda
        await supabase.auth.signOut();
      }
    }
  } catch (error) {
    console.error("Middleware invocation error:", error);
  }

  return supabaseResponse;
}
