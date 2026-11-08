"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { RoleManager } from "@/components/organisms/RoleManager";
import type { AdminRoleItem, RoleMemberItem } from "@/app/actions/roles";

interface RolesPageProps {
  canManage: boolean;
  roles: AdminRoleItem[];
  members: RoleMemberItem[];
  currentEmail?: string;
}

export function RolesPage({ canManage, roles, members, currentEmail }: RolesPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {canManage ? (
          <RoleManager initialRoles={roles} initialMembers={members} currentEmail={currentEmail} />
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-6 shadow-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
                Akses Terbatas
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Halaman Role hanya dapat dibuka oleh Ketua Umum, Wakil Ketua, dan Developer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
