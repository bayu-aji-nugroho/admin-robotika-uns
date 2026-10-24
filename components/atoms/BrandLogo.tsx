import React from "react";

interface BrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export function BrandLogo({ className = "", showSubtitle = true }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Lambang Resmi UNS (Crest SVG Representation) */}
      <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circular Base */}
          <circle cx="50" cy="50" r="46" fill="#0E4194" stroke="#FBB03B" strokeWidth="4" />
          {/* Inner Petal/Lotus Motif */}
          <path
            d="M50 14 C36 28 26 44 26 58 C26 71 36 82 50 84 C64 82 74 71 74 58 C74 44 64 28 50 14 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
          {/* Flame / Obor Pusat */}
          <path
            d="M50 24 C44 36 41 46 41 54 C41 62 45 68 50 70 C55 68 59 62 59 54 C59 46 56 36 50 24 Z"
            fill="#B22234"
          />
          <path
            d="M50 34 C47 42 45 48 45 53 C45 58 47 62 50 63 C53 62 55 58 55 53 C55 48 53 42 50 34 Z"
            fill="#FBB03B"
          />
          {/* Decorative Stars / Gear Elements */}
          <circle cx="50" cy="74" r="3" fill="#0E4194" />
        </svg>
      </div>

      {/* Divider Vertikal 1px (#e4e4e7, tinggi 28px) */}
      <div className="h-7 w-[1px] bg-[#E4E4E7]" />

      {/* Wordmark Robotika UNS */}
      <div className="flex flex-col leading-tight">
        <span className="font-extrabold text-base sm:text-lg tracking-wider text-[#18181b] uppercase">
          ROBOTIKA
        </span>
        {showSubtitle && (
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#71717a] tracking-normal -mt-0.5">
            Universitas Sebelas Maret
          </span>
        )}
      </div>
    </div>
  );
}
