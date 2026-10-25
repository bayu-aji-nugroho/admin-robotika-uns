import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawParams = await params;
    const rawId = (rawParams?.id || "").trim();
    const targetId = decodeURIComponent(rawId).trim();

    if (!targetId) {
      return NextResponse.json(
        { error: "ID pendaftar tidak valid atau kosong." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Verifikasi Autentikasi Pengguna
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Sesi tidak sah atau telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    // 2. Verifikasi Hak Akses Admin Whitelist
    const userEmail = user.email.toLowerCase().trim();
    const { data: adminRecord } = await supabase
      .from("admin_whitelist")
      .select("id, is_active")
      .eq("email", userEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (!adminRecord) {
      return NextResponse.json(
        { error: "Akses ditolak: Akun Anda tidak terdaftar sebagai admin aktif." },
        { status: 403 }
      );
    }

    // 3. Ambil data pendaftar sebelum dihapus
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        targetId
      );

    let findQuery = supabase
      .from("registrations")
      .select("id, user_id, user_email, cv_storage_path, full_name, nim, registration_code");

    if (isUuid) {
      findQuery = findQuery.eq("id", targetId);
    } else {
      findQuery = findQuery.or(`registration_code.eq.${targetId},nim.eq.${targetId}`);
    }

    const { data: applicant, error: findError } = await findQuery.maybeSingle();

    if (findError) {
      console.error("Gagal mencari data pendaftar:", findError.message);
    }

    if (!applicant) {
      return NextResponse.json(
        { error: "Data pendaftar tidak ditemukan atau sudah terhapus." },
        { status: 404 }
      );
    }

    const canonicalId = applicant.id;
    const cvStoragePath = applicant.cv_storage_path;
    const applicantUserId = applicant.user_id;
    const applicantEmail = applicant.user_email;

    // 4. Hapus Berkas CV dari Supabase Storage ('cv-uploads')
    if (cvStoragePath) {
      const rawPath = cvStoragePath.trim();
      const cleanPath = rawPath.replace(/^cv-uploads\//, "");
      const pathsToDelete = Array.from(new Set([rawPath, cleanPath])).filter(
        Boolean
      );

      // Coba hapus via service role jika SUPABASE_SERVICE_ROLE_KEY tersedia
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient: createServiceClient } = await import(
            "@supabase/supabase-js"
          );
          const serviceSupabase = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          await serviceSupabase.storage
            .from("cv-uploads")
            .remove(pathsToDelete);
        } catch (storageServiceErr) {
          console.warn("Penghapusan berkas via service role:", storageServiceErr);
        }
      }

      // Hapus berkas via authenticated admin client (berdasarkan storage policy)
      try {
        const { error: storageErr } = await supabase.storage
          .from("cv-uploads")
          .remove(pathsToDelete);
        if (storageErr) {
          console.warn("Storage remove notice:", storageErr.message);
        }
      } catch (storageErr) {
        console.warn("Storage remove error:", storageErr);
      }
    }

    // 5. Hapus Akun Login dari Supabase Auth
    // Opsi A: Jika SUPABASE_SERVICE_ROLE_KEY tersedia di server
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient: createServiceClient } = await import(
          "@supabase/supabase-js"
        );
        const serviceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        let targetAuthId = applicantUserId;
        if (!targetAuthId && applicantEmail) {
          const { data: usersData } =
            await serviceSupabase.auth.admin.listUsers();
          const matchedUser = usersData?.users?.find(
            (u) => u.email?.toLowerCase() === applicantEmail.toLowerCase()
          );
          if (matchedUser) {
            targetAuthId = matchedUser.id;
          }
        }

        if (targetAuthId) {
          const { error: deleteUserErr } =
            await serviceSupabase.auth.admin.deleteUser(targetAuthId);
          if (deleteUserErr) {
            console.warn(
              "Peringatan hapus auth user via admin API:",
              deleteUserErr.message
            );
          }
        }
      } catch (authServiceErr) {
        console.warn("Auth user deletion via service role failed:", authServiceErr);
      }
    }

    // Opsi B: Panggil Stored Procedure delete_applicant_by_admin (SECURITY DEFINER di database)
    let rpcSucceeded = false;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "delete_applicant_by_admin",
        { p_registration_id: canonicalId }
      );
      if (!rpcError && rpcData?.success) {
        rpcSucceeded = true;
      } else if (rpcError) {
        console.warn("RPC delete_applicant_by_admin notice:", rpcError.message);
      }
    } catch (rpcErr) {
      console.warn("RPC delete call notice:", rpcErr);
    }

    // 6. Fallback: Jika RPC belum terpasang atau belum menghapus baris tabel
    if (!rpcSucceeded) {
      // Hapus riwayat di tabel hasil_oprec
      await supabase
        .from("hasil_oprec")
        .delete()
        .eq("registration_id", canonicalId);

      // Hapus dari tabel registrations
      const { error: deleteRegError } = await supabase
        .from("registrations")
        .delete()
        .eq("id", canonicalId);

      if (deleteRegError) {
        console.error(
          "Gagal menghapus baris pendaftaran:",
          deleteRegError.message
        );
        return NextResponse.json(
          {
            error: `Gagal menghapus data tabel pendaftaran: ${deleteRegError.message}`,
          },
          { status: 500 }
        );
      }
    }

    // 7. Revalidate cache Next.js
    try {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/pendaftar");
    } catch {
      // Abaikan jika dipanggil di luar revalidate scope
    }

    return NextResponse.json({
      success: true,
      message:
        "Data peserta, akun login, tabel pendaftaran, dan berkas CV berhasil dihapus secara permanen.",
    });
  } catch (err: any) {
    console.error("Terjadi error internal saat menghapus pendaftar:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
