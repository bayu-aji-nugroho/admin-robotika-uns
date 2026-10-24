"use client";

import React from "react";
import { GoogleSignInButton } from "@/components/molecules/GoogleSignInButton";
import { ShieldAlert, AlertCircle, X } from "lucide-react";

interface LoginCardProps {
  onSignIn?: () => void;
  isLoading?: boolean;
  errorType?: string | null;
  deniedEmail?: string | null;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export function LoginCard({
  onSignIn,
  isLoading = false,
  errorType,
  deniedEmail,
  errorMessage,
  onClearError,
}: LoginCardProps) {
  const isUnauthorized = errorType === "unauthorized_email";

  return (
    <div className="w-full max-w-[460px] bg-white border border-[#E4E4E7] rounded-3xl shadow-xl shadow-zinc-950/5 p-6 sm:p-8 transition-all relative">

      {/* 2. Error Notification (Crimson alert when unauthorized or error) */}
      {errorType && (
        <div className="mt-5 p-4 rounded-2xl bg-[#FCF2F3] border border-[#F8D7DA] relative animate-in fade-in slide-in-from-top-2 duration-200">
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="absolute top-3 right-3 text-[#B22234]/70 hover:text-[#B22234] p-1 rounded-md transition-colors"
              aria-label="Tutup pesan"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white border border-[#F8D7DA] shrink-0 text-[#B22234] shadow-xs">
              {isUnauthorized ? (
                <ShieldAlert className="w-5 h-5 text-[#B22234]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#B22234]" />
              )}
            </div>
            <div className="flex-1 pr-4">
              <div className="text-xs font-bold text-[#B22234] uppercase tracking-wider">
                {isUnauthorized ? "Akses Ditolak" : "Autentikasi Gagal"}
              </div>
              <p className="text-xs text-[#8B0000] mt-1 font-medium leading-relaxed">
                {isUnauthorized ? (
                  <>
                    Email <span className="font-bold underline decoration-dotted">{deniedEmail || "tersebut"}</span> tidak terdaftar dalam whitelist pengurus. Hanya akun yang diizinkan yang dapat memasuki dashboard.
                  </>
                ) : (
                  errorMessage || "Terjadi kendala saat memvalidasi akun. Silakan coba kembali."
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Action Section: Google Sign-In Button */}
      <div className="mt-6 space-y-4">
        <GoogleSignInButton onSignIn={onSignIn} isLoading={isLoading} />
      </div>

    
    </div>
  );
}
