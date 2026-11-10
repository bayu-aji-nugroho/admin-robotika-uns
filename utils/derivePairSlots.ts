import type {
  InterviewPair,
  MemberAvailabilitySlot,
  PairAvailabilitySlot,
  ScheduledInterview,
} from "@/utils/interviewSchedule.types";

/**
 * Slot pasangan = irisan kalender pribadi kedua anggota pasangan aktif
 * (logika sama dengan view interview_availability di database), lengkap dengan status booking.
 * Kompleksitas O(slot): tiap kalender diindeks dengan Map berdasarkan waktu mulai.
 */
export function derivePairSlots(
  pairs: InterviewPair[],
  memberAvailability: MemberAvailabilitySlot[],
  scheduled: ScheduledInterview[]
): PairAvailabilitySlot[] {
  const byAdmin = new Map<string, Map<number, MemberAvailabilitySlot>>();
  for (const slot of memberAvailability) {
    let slots = byAdmin.get(slot.adminId);
    if (!slots) {
      slots = new Map();
      byAdmin.set(slot.adminId, slots);
    }
    slots.set(new Date(slot.startAt).getTime(), slot);
  }

  const bookingByKey = new Map(
    scheduled.filter((s) => s.pairId).map((s) => [`${s.pairId}|${new Date(s.startAt).getTime()}`, s])
  );

  const result: PairAvailabilitySlot[] = [];
  for (const pair of pairs) {
    if (pair.status !== "active") continue;
    const slotsA = byAdmin.get(pair.memberA);
    const slotsB = byAdmin.get(pair.memberB);
    if (!slotsA || !slotsB) continue;

    for (const [time, a] of slotsA) {
      const b = slotsB.get(time);
      if (!b) continue;
      const booking = bookingByKey.get(`${pair.id}|${time}`);
      result.push({
        id: `${pair.id}|${time}`,
        pairId: pair.id,
        startAt: a.startAt,
        location: a.location || b.location || null,
        updatedByName: null,
        booking: booking ? { applicantName: booking.applicantName, status: booking.status } : null,
      });
    }
  }

  return result.sort((x, y) => x.startAt.localeCompare(y.startAt));
}
