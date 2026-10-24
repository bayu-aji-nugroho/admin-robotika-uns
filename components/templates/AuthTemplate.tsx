import React from "react";

interface AuthTemplateProps {
  children: React.ReactNode;
}

export function AuthTemplate({ children }: AuthTemplateProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F9F9F8] relative overflow-hidden selection:bg-[#F8D7DA] selection:text-[#8B0000]">
      {/* Background Engineering Schematic Pattern & Subtle Crimson Aura */}
      <div className="absolute inset-0 bg-schematic-grid opacity-60 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#B22234]/5 blur-[120px] pointer-events-none" />

      {/* Centered Single Card Container */}
      <main className="relative z-10 w-full flex items-center justify-center my-auto">
        {children}
      </main>
    </div>
  );
}
