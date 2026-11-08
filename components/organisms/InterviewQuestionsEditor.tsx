"use client";

import React, { useState } from "react";
import { Button } from "@/components/atoms/Button";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  InterviewQuestionItem,
  addInterviewQuestionAction,
  updateInterviewQuestionAction,
  deleteInterviewQuestionAction,
} from "@/app/actions/interviewQuestions";

export interface DivisionOption {
  id: string;
  name: string;
  category?: string;
}

interface InterviewQuestionsEditorProps {
  initialQuestions: InterviewQuestionItem[];
  canManage: boolean;
  userRole?: string;
  availableDivisions?: DivisionOption[];
}

type DivisionGroupKey = "werkudara" | "cakrawala" | "non-teknis";

// Subdivisi teknis tiap tim. ID pertanyaan = "<tim>-<subdivisi>",
// sama dengan ID divisi pendaftar (mis. "werkudara-elektronika").
const TECHNICAL_SUBDIVISIONS: { key: string; name: string }[] = [
  { key: "pemrograman", name: "Pemrograman" },
  { key: "elektronika", name: "Elektronika" },
  { key: "mekanika", name: "Mekanika" },
];

const DIVISION_GROUPS: { key: DivisionGroupKey; name: string }[] = [
  { key: "werkudara", name: "Tim Werkudara" },
  { key: "cakrawala", name: "Tim Cakrawala" },
  { key: "non-teknis", name: "Non-Teknis" },
];

const FALLBACK_NON_TECHNICAL_DIVISIONS: DivisionOption[] = [
  { id: "administrasi", name: "Administrasi" },
  { id: "bendahara", name: "Keuangan" },
  { id: "humas", name: "Hubungan Eksternal" },
  { id: "media-branding", name: "Media Visual" },
  { id: "pengembangan-organisasi", name: "Pengembangan Organisasi" },
];

function getDivisionGroup(divisionId: string): DivisionGroupKey {
  if (divisionId.startsWith("werkudara-")) return "werkudara";
  if (divisionId.startsWith("cakrawala-")) return "cakrawala";
  return "non-teknis";
}

export function InterviewQuestionsEditor({
  initialQuestions = [],
  canManage = false,
  userRole = "admin",
  availableDivisions = [],
}: InterviewQuestionsEditorProps) {
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>(initialQuestions);
  const [activeTab, setActiveTab] = useState<"general" | "division">("general");
  const [selectedDivision, setSelectedDivision] = useState<string>("werkudara-pemrograman");

  const nonTechnicalDivisions = (() => {
    const fromDb = availableDivisions.filter((d) => d.category && d.category !== "teknis");
    return fromDb.length > 0 ? fromDb : FALLBACK_NON_TECHNICAL_DIVISIONS;
  })();

  const selectedGroup = getDivisionGroup(selectedDivision);
  const subdivisionOptions: DivisionOption[] =
    selectedGroup === "non-teknis"
      ? nonTechnicalDivisions
      : TECHNICAL_SUBDIVISIONS.map((s) => ({ id: `${selectedGroup}-${s.key}`, name: s.name }));

  // Pertanyaan lama yang disimpan tanpa prefix tim (mis. "elektronika")
  // tetap berlaku untuk kedua tim; tampilkan juga di tab subdivisi terkait.
  const sharedSubdivisionKey =
    selectedGroup === "non-teknis" ? null : selectedDivision.replace(`${selectedGroup}-`, "");

  const selectedDivisionLabel = (() => {
    const sub = subdivisionOptions.find((d) => d.id === selectedDivision)?.name || selectedDivision;
    const group = DIVISION_GROUPS.find((g) => g.key === selectedGroup);
    return selectedGroup === "non-teknis" ? sub : `${group?.name} - ${sub}`;
  })();

  const handleSelectGroup = (group: DivisionGroupKey) => {
    const firstOption =
      group === "non-teknis"
        ? nonTechnicalDivisions[0]?.id || "administrasi"
        : `${group}-${TECHNICAL_SUBDIVISIONS[0].key}`;
    setSelectedDivision(firstOption);
    setEditingId(null);
    setDeletingId(null);
  };

  // Form state
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Alert feedback
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const generalQuestions = questions.filter((q) => q.division === "general");
  const divisionQuestions = questions.filter(
    (q) =>
      q.division === selectedDivision ||
      (sharedSubdivisionKey !== null && q.division === sharedSubdivisionKey)
  );

  // Handler: Tambah Pertanyaan
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || isSubmitting) return;

    const trimmed = newQuestionText.trim();
    if (!trimmed) {
      showAlert("error", "Teks pertanyaan tidak boleh kosong.");
      return;
    }

    if (trimmed.length < 5) {
      showAlert("error", "Pertanyaan minimal 5 karakter.");
      return;
    }

    const targetDivision = activeTab === "general" ? "general" : selectedDivision;

    try {
      setIsSubmitting(true);
      const res = await addInterviewQuestionAction({
        question: trimmed,
        division: targetDivision,
        order_index:
          (activeTab === "general" ? generalQuestions.length : divisionQuestions.length) + 1,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal menambahkan pertanyaan.");
      }

      setQuestions((prev) => [...prev, res.data!]);
      setNewQuestionText("");
      showAlert("success", "Pertanyaan berhasil ditambahkan.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan pertanyaan.";
      showAlert("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Mulai Edit
  const handleStartEdit = (q: InterviewQuestionItem) => {
    if (!canManage) return;
    setEditingId(q.id);
    setEditingText(q.question);
  };

  // Handler: Batalkan Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  // Handler: Simpan Edit
  const handleSaveEdit = async (id: string) => {
    if (!canManage || isSubmitting) return;

    const trimmed = editingText.trim();
    if (!trimmed || trimmed.length < 5) {
      showAlert("error", "Teks pertanyaan minimal 5 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updateInterviewQuestionAction(id, { question: trimmed });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal memperbarui pertanyaan.");
      }

      setQuestions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, question: trimmed } : item))
      );
      setEditingId(null);
      setEditingText("");
      showAlert("success", "Pertanyaan berhasil diperbarui.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui pertanyaan.";
      showAlert("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Hapus Pertanyaan
  const handleDeleteQuestion = async (id: string) => {
    if (!canManage || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await deleteInterviewQuestionAction(id);

      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus pertanyaan.");
      }

      setQuestions((prev) => prev.filter((item) => item.id !== id));
      setDeletingId(null);
      showAlert("success", "Pertanyaan berhasil dihapus.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus pertanyaan.";
      showAlert("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E4E4E7] dark:border-zinc-800">
        <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
          Editor Pertanyaan Interview
        </h2>

        <div>
          {canManage ? (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
              <span>Akses Penuh ({userRole})</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
              <span>Mode Lihat</span>
            </span>
          )}
        </div>
      </div>

      {/* Alert Notification */}
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

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "general"
              ? "border-[#B22234] text-[#B22234] dark:text-rose-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Pertanyaan General
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("division")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "division"
              ? "border-[#B22234] text-[#B22234] dark:text-rose-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Pertanyaan Per Divisi
        </button>
      </div>

      {/* TAB GENERAL */}
      {activeTab === "general" && (
        <div className="space-y-4">
          {/* Form Tambah */}
          {canManage && (
            <form onSubmit={handleAddQuestion} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Tulis pertanyaan umum baru..."
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting || !newQuestionText.trim()}
                isLoading={isSubmitting}
                icon={<Plus className="w-4 h-4" />}
                className="shrink-0"
              >
                Tambah
              </Button>
            </form>
          )}

          {/* List Pertanyaan General */}
          <div className="space-y-2">
            {generalQuestions.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
                Belum ada pertanyaan.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                {generalQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    {editingId === q.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-[#B22234] rounded-md text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(q.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#B22234] text-white text-xs font-semibold hover:bg-[#8B0000] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 font-medium leading-relaxed">
                          {q.question}
                        </p>
                      </div>
                    )}

                    {canManage && editingId !== q.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(q)}
                          title="Edit"
                          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {deletingId === q.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-md border border-rose-200 dark:border-rose-800">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-300 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(q.id)}
                            title="Hapus"
                            className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB PER DIVISI */}
      {activeTab === "division" && (
        <div className="space-y-4">
          {/* Pilihan Tim / Kelompok Divisi */}
          <div className="inline-flex p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 gap-1 flex-wrap">
            {DIVISION_GROUPS.map((group) => {
              const isSelected = selectedGroup === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => handleSelectGroup(group.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-zinc-950 text-[#B22234] dark:text-rose-400 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {group.name}
                </button>
              );
            })}
          </div>

          {/* Pills Pilihan Subdivisi */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {subdivisionOptions.map((div) => {
              const isSelected = selectedDivision === div.id;
              return (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => {
                    setSelectedDivision(div.id);
                    setEditingId(null);
                    setDeletingId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#B22234] text-white shadow-xs font-semibold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {div.name}
                </button>
              );
            })}
          </div>

          {/* Form Tambah */}
          {canManage && (
            <form onSubmit={handleAddQuestion} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder={`Tulis pertanyaan untuk ${selectedDivisionLabel}...`}
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting || !newQuestionText.trim()}
                isLoading={isSubmitting}
                icon={<Plus className="w-4 h-4" />}
                className="shrink-0"
              >
                Tambah
              </Button>
            </form>
          )}

          {/* List Pertanyaan Divisi Terpilih */}
          <div className="space-y-2">
            {divisionQuestions.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
                Belum ada pertanyaan untuk {selectedDivisionLabel}.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                {divisionQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    {editingId !== q.id && q.division === sharedSubdivisionKey && (
                      <span
                        title="Pertanyaan lama tanpa tim; muncul untuk pendaftar Werkudara dan Cakrawala"
                        className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                      >
                        Kedua tim
                      </span>
                    )}
                    {editingId === q.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-[#B22234] rounded-md text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(q.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#B22234] text-white text-xs font-semibold hover:bg-[#8B0000] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 font-medium leading-relaxed">
                          {q.question}
                        </p>
                      </div>
                    )}

                    {canManage && editingId !== q.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(q)}
                          title="Edit"
                          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {deletingId === q.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-md border border-rose-200 dark:border-rose-800">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-300 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(q.id)}
                            title="Hapus"
                            className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
