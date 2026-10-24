"use client";

import React, { Suspense, useState } from "react";
import { AuthTemplate } from "@/components/templates/AuthTemplate";
import { LoginCard } from "@/components/organisms/LoginCard";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const errorType = searchParams.get("error");
  const deniedEmail = searchParams.get("email");
  const urlMessage = searchParams.get("message");

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setLocalError(null);
      const supabase = createClient();

      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setLocalError(error.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghubungkan ke layanan Google.";
      setLocalError(message);
      setIsLoading(false);
    }
  };

  const handleClearError = () => {
    router.replace("/", { scroll: false });
    setLocalError(null);
  };

  return (
    <LoginCard
      onSignIn={handleSignIn}
      isLoading={isLoading}
      errorType={errorType || (localError ? "general_error" : null)}
      deniedEmail={deniedEmail}
      errorMessage={localError || urlMessage}
      onClearError={handleClearError}
    />
  );
}

export function LoginPage() {
  return (
    <AuthTemplate>
      <Suspense
        fallback={
          <div className="w-full max-w-[460px] h-[360px] bg-white rounded-3xl animate-pulse shadow-sm border border-zinc-100" />
        }
      >
        <LoginContent />
      </Suspense>
    </AuthTemplate>
  );
}
