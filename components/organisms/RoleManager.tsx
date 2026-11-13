"use client";

import React, { useState } from "react";
import { Button } from "@/components/atoms/Button";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Users,
} from "lucide-react";
import {
  AdminRoleItem,
  RoleMemberItem,
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  assignRoleMemberAction,
  revokeRoleMemberAction,
} from "@/app/actions/roles";
import { ADMIN_PERMISSIONS, AdminPermission } from "@/utils/permissions";

interface RoleManagerProps {
  initialRoles: AdminRoleItem[];
  initialMembers: RoleMemberItem[];
  currentEmail?: string;
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors";

const cardClass =
  "bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs";

function permissionLabel(key: string) {
  return ADMIN_PERMISSIONS.find((p) => p.key === key)?.label || key;
}

function PermissionChecklist({
  value,
  onChange,
  disabled,
}: {
  value: AdminPermission[];
  onChange: (next: AdminPermission[]) => void;
  disabled?: boolean;
}) {
  const isViewer = value.includes("viewer.readonly");
  // Viewer eksklusif: memilih Viewer menghapus hak lain, memilih hak lain menghapus Viewer
  const toggle = (key: AdminPermission) => {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key));
    } else if (key === "viewer.readonly") {
      onChange(["viewer.readonly"]);
    } else {
      onChange([...value.filter((k) => k !== "viewer.readonly"), key]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ADMIN_PERMISSIONS.map((perm) => {
        const checked = value.includes(perm.key);
        const dimmed = isViewer && perm.key !== "viewer.readonly";
        return (
          <label
            key={perm.key}
            className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
              perm.key === "viewer.readonly" ? "sm:col-span-2" : ""
            } ${dimmed ? "opacity-50" : ""} ${
              checked
                ? "border-[#B22234]/60 bg-[#FCF2F3] dark:bg-rose-950/20 dark:border-rose-900/60"
                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(perm.key)}
              className="mt-0.5 accent-[#B22234] cursor-pointer"
            />
            <span className="min-w-0">
              <span className="block text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">
                {perm.label}
              </span>
              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                {perm.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function MemberRow({
  member,
  roles,
  isSelf,
  busy,
  onMove,
  onRevoke,
}: {
  member: RoleMemberItem;
  roles: AdminRoleItem[];
  isSelf: boolean;
  busy: boolean;
  onMove: (member: RoleMemberItem, roleId: string) => void;
  onRevoke: (member: RoleMemberItem) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const locked = member.is_superadmin;

  return (
    <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100 truncate">
          {member.full_name || member.email.split("@")[0]}
          {isSelf && <span className="ml-1.5 text-[11px] font-medium text-zinc-400">(Anda)</span>}
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
          {member.email}
          {member.role_division ? ` · ${member.role_division}` : ""}
        </p>
      </div>

      {locked ? (
        <span className="self-start sm:self-center inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-3 h-3" /> Superadmin
        </span>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={member.role_id || ""}
            disabled={busy}
            onChange={(e) => e.target.value && onMove(member, e.target.value)}
            title="Pindahkan ke role lain"
            className="text-[11px] font-medium px-2 py-1.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer max-w-[150px]"
          >
            {!member.role_id && <option value="">Tanpa role</option>}
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {confirming ? (
            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-md border border-rose-200 dark:border-rose-800">
              <button
                type="button"
                disabled={busy}
                onClick={() => onRevoke(member)}
                className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Cabut
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-300 cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || isSelf}
              onClick={() => setConfirming(true)}
              title={isSelf ? "Tidak bisa mencabut akses sendiri" : "Cabut akses admin"}
              className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserMinus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddMemberForm({
  roleId,
  busy,
  onSubmit,
  onCancel,
}: {
  roleId: string;
  busy: boolean;
  onSubmit: (input: { roleId: string; email: string; fullName: string; roleDivision: string }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleDivision, setRoleDivision] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit({ roleId, email, fullName, roleDivision });
    if (ok) {
      setEmail("");
      setFullName("");
      setRoleDivision("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-2"
    >
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Masukkan email Google yang dipakai untuk login. Jika email sudah terdaftar sebagai admin,
        role-nya akan dipindahkan ke role ini.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@student.uns.ac.id"
          className={inputClass}
          disabled={busy}
        />
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nama (opsional)"
          className={inputClass}
          disabled={busy}
        />
        <input
          type="text"
          value={roleDivision}
          onChange={(e) => setRoleDivision(e.target.value)}
          placeholder="Jabatan/divisi (opsional)"
          className={inputClass}
          disabled={busy}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={busy}
          disabled={busy || !email.trim()}
          icon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Tambahkan
        </Button>
      </div>
    </form>
  );
}

export function RoleManager({
  initialRoles,
  initialMembers,
  currentEmail = "",
}: RoleManagerProps) {
  const [roles, setRoles] = useState<AdminRoleItem[]>(initialRoles);
  const [members, setMembers] = useState<RoleMemberItem[]>(initialMembers);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form tambah role
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPermissions, setNewPermissions] = useState<AdminPermission[]>(["applicants.view"]);

  // Edit role
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);

  const [addingMemberRoleId, setAddingMemberRoleId] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const superadmins = members.filter((m) => m.is_superadmin);
  const unassigned = members.filter((m) => !m.is_superadmin && !m.role_id);

  const run = async <T,>(
    fn: () => Promise<{ success: boolean; data?: T; error?: string }>,
    successMessage: string
  ): Promise<T | null> => {
    try {
      setBusy(true);
      const res = await fn();
      if (!res.success) {
        throw new Error(res.error || "Terjadi kesalahan.");
      }
      showAlert("success", successMessage);
      return (res.data ?? null) as T | null;
    } catch (err: unknown) {
      showAlert("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await run(
      () =>
        createRoleAction({
          name: newName,
          description: newDescription,
          permissions: newPermissions,
        }),
      `Role "${newName.trim()}" berhasil dibuat.`
    );
    if (created) {
      setRoles((prev) => [...prev, created]);
      setNewName("");
      setNewDescription("");
      setNewPermissions(["applicants.view"]);
      setShowCreate(false);
    }
  };

  const startEdit = (role: AdminRoleItem) => {
    setEditingId(role.id);
    setEditName(role.name);
    setEditDescription(role.description || "");
    setEditPermissions(role.permissions);
  };

  const handleSaveEdit = async (roleId: string) => {
    const updated = await run(
      () =>
        updateRoleAction(roleId, {
          name: editName,
          description: editDescription,
          permissions: editPermissions,
        }),
      "Role berhasil diperbarui."
    );
    if (updated) {
      setRoles((prev) => prev.map((r) => (r.id === roleId ? updated : r)));
      setEditingId(null);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const deleted = await run(() => deleteRoleAction(roleId), "Role berhasil dihapus.");
    if (deleted) {
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      setMembers((prev) => prev.map((m) => (m.role_id === roleId ? { ...m, role_id: null } : m)));
    }
    setDeletingRoleId(null);
  };

  const upsertMember = (member: RoleMemberItem) => {
    setMembers((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.map((m) => (m.id === member.id ? member : m))
        : [...prev, member]
    );
  };

  const handleAddMember = async (input: {
    roleId: string;
    email: string;
    fullName: string;
    roleDivision: string;
  }) => {
    const member = await run(
      () => assignRoleMemberAction(input),
      `${input.email.trim()} berhasil ditambahkan.`
    );
    if (member) {
      upsertMember(member);
      return true;
    }
    return false;
  };

  const handleMoveMember = async (member: RoleMemberItem, roleId: string) => {
    if (member.role_id === roleId) return;
    const roleName = roles.find((r) => r.id === roleId)?.name || "role baru";
    const updated = await run(
      () => assignRoleMemberAction({ roleId, email: member.email }),
      `${member.full_name || member.email} dipindahkan ke ${roleName}.`
    );
    if (updated) upsertMember(updated);
  };

  const handleRevokeMember = async (member: RoleMemberItem) => {
    const revoked = await run(
      () => revokeRoleMemberAction(member.id),
      `Akses admin ${member.full_name || member.email} telah dicabut.`
    );
    if (revoked) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardClass} space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#18181b] dark:text-zinc-100">
              Role & Akses Admin
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Buat role dengan hak akses tertentu, lalu berikan role tersebut ke pengurus lain.
            </p>
          </div>
          {!showCreate && (
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreate(true)}
              className="shrink-0"
            >
              Tambah Role
            </Button>
          )}
        </div>

        {alert && (
          <div
            role="alert"
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs sm:text-sm ${
              alert.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <p className="font-medium">{alert.message}</p>
          </div>
        )}

        {/* Form Tambah Role */}
        {showCreate && (
          <form
            onSubmit={handleCreateRole}
            className="space-y-3 pt-3 border-t border-[#E4E4E7] dark:border-zinc-800"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama role, mis. Pewawancara"
                maxLength={50}
                className={inputClass}
                disabled={busy}
                required
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Deskripsi singkat (opsional)"
                className={inputClass}
                disabled={busy}
              />
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Hak akses</p>
            <PermissionChecklist value={newPermissions} onChange={setNewPermissions} disabled={busy} />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="md" onClick={() => setShowCreate(false)} disabled={busy}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={busy}
                disabled={busy || newName.trim().length < 2}
              >
                Simpan Role
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Superadmin */}
      <div className={`${cardClass} space-y-3`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
            Superadmin
          </h2>
          <span className="text-[11px] font-mono text-zinc-400">{superadmins.length} orang</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ketua Umum, Wakil Ketua, dan Developer otomatis memiliki semua akses dan satu-satunya yang
          dapat mengelola role. Status ini hanya dapat diubah langsung lewat database.
        </p>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
          {superadmins.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              roles={roles}
              isSelf={m.email.toLowerCase() === currentEmail}
              busy={busy}
              onMove={handleMoveMember}
              onRevoke={handleRevokeMember}
            />
          ))}
        </div>
      </div>

      {/* Daftar Role */}
      {roles.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
          Belum ada role. Klik &quot;Tambah Role&quot; untuk membuat role pertama.
        </div>
      ) : (
        roles.map((role) => {
          const roleMembers = members.filter((m) => m.role_id === role.id && !m.is_superadmin);
          const isEditing = editingId === role.id;

          return (
            <div key={role.id} className={`${cardClass} space-y-4`}>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={50}
                      className={inputClass}
                      disabled={busy}
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Deskripsi singkat (opsional)"
                      className={inputClass}
                      disabled={busy}
                    />
                  </div>
                  <PermissionChecklist value={editPermissions} onChange={setEditPermissions} disabled={busy} />
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={busy}>
                      Batal
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={busy}
                      disabled={busy || editName.trim().length < 2}
                      onClick={() => handleSaveEdit(role.id)}
                    >
                      Simpan Perubahan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
                        {role.name}
                      </h2>
                      {role.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{role.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.length === 0 ? (
                        <span className="text-[11px] text-zinc-400 italic">Belum ada hak akses</span>
                      ) : (
                        role.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                          >
                            {permissionLabel(p)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(role)}
                      title="Edit role"
                      className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {deletingRoleId === role.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-md border border-rose-200 dark:border-rose-800">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeleteRole(role.id)}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRoleId(null)}
                          className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-300 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingRoleId(role.id)}
                        title="Hapus role"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Anggota Role */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Users className="w-3.5 h-3.5" />
                    <span>Anggota ({roleMembers.length})</span>
                  </div>
                  {addingMemberRoleId !== role.id && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<UserPlus className="w-3.5 h-3.5" />}
                      onClick={() => setAddingMemberRoleId(role.id)}
                    >
                      Tambah Orang
                    </Button>
                  )}
                </div>

                {addingMemberRoleId === role.id && (
                  <AddMemberForm
                    roleId={role.id}
                    busy={busy}
                    onSubmit={handleAddMember}
                    onCancel={() => setAddingMemberRoleId(null)}
                  />
                )}

                {roleMembers.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
                    Belum ada orang dengan role ini.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                    {roleMembers.map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        roles={roles}
                        isSelf={m.email.toLowerCase() === currentEmail}
                        busy={busy}
                        onMove={handleMoveMember}
                        onRevoke={handleRevokeMember}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Admin tanpa role */}
      {unassigned.length > 0 && (
        <div className={`${cardClass} space-y-3`}>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
              Admin Tanpa Role
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Orang berikut masih bisa login tetapi tidak memiliki hak akses apa pun. Pilih role untuk mereka.
          </p>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
            {unassigned.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                roles={roles}
                isSelf={m.email.toLowerCase() === currentEmail}
                busy={busy}
                onMove={handleMoveMember}
                onRevoke={handleRevokeMember}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
