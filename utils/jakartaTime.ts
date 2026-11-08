// Seluruh jadwal wawancara memakai zona waktu WIB (Asia/Jakarta, UTC+7, tanpa DST).
export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

// Rentang jam wawancara: sesi pertama mulai 07.00, sesi terakhir selesai 21.00
export const SCHEDULE_MIN_HOUR = 7;
export const SCHEDULE_MAX_HOUR = 21;
export const SCHEDULE_START_HOURS = Array.from(
  { length: SCHEDULE_MAX_HOUR - SCHEDULE_MIN_HOUR },
  (_, i) => SCHEDULE_MIN_HOUR + i
);

/** Jam WIB (0–23) dari sebuah timestamp. */
export function jakartaHour(iso: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return parseInt(hour, 10);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-15" + 9 -> "2026-11-15T09:00:00+07:00" */
export function toJakartaIso(date: string, hour: number): string {
  return `${date}T${pad(hour)}:00:00+07:00`;
}

/** Tanggal hari ini di WIB dalam format YYYY-MM-DD (untuk atribut min input date). */
export function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Kunci tanggal WIB (YYYY-MM-DD) dari sebuah timestamp, untuk pengelompokan. */
export function jakartaDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Timestamp -> nilai input datetime-local dalam WIB ("2026-11-20T19:00"). */
export function toJakartaInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${date}T${time}`;
}

/** Nilai input datetime-local (dibaca sebagai WIB) -> ISO dengan offset +07:00. */
export function fromJakartaInputValue(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+07:00` : null;
}

/** "Jumat, 20 November 2026 pukul 19.00 WIB" */
export function formatJakartaDateTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatJakartaDate(iso)} pukul ${time} WIB`;
}

/** "Sabtu, 15 November 2026" */
export function formatJakartaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "09.00–10.00" (sesi 60 menit) */
export function formatJakartaHourRange(iso: string): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("id-ID", {
      timeZone: JAKARTA_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(start)}–${fmt(end)}`;
}
