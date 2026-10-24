"use client";

import React from "react";
import { GoogleIcon } from "@/components/atoms/GoogleIcon";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  onSignIn?: () => void;
  isLoading?: boolean;
}

export function GoogleSignInButton({
  onSignIn,
  isLoading = false,
}: GoogleSignInButtonProps) {
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onSignIn}
        disabled={isLoading}
        className="group relative w-full flex items-center justify-between px-4 py-3 sm:py-3.5 bg-white hover:bg-[#F9F9F8] active:bg-[#F4F4F5] border border-[#E4E4E7] hover:border-[#B22234] rounded-xl shadow-xs transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#B22234] focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 group-hover:scale-105 transition-transform">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-[#B22234] animate-spin" />
            ) : (
              <GoogleIcon size={20} />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold text-[#18181b] tracking-tight group-hover:text-[#B22234] transition-colors">
              {isLoading ? "Menghubungkan ke Google..." : "Masuk dengan Akun Google UNS"}
            </span>
            <span className="text-[11px] font-medium text-[#71717a]">
              Khusus email pengurus yang terdaftar di sistem
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
