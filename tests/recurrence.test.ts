import { describe, it, expect } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import { expandOpenGym, buildWeeklyRRule } from "@/lib/recurrence";
import type { OpenGymClient } from "@/lib/types";

const TZ = "Europe/Amsterdam";

function makeGym(overrides: Partial<OpenGymClient> = {}): OpenGymClient {
  return {
    id: "gym1",
    clubId: "club1",
    dedupKey: "k",
    rrule: "RRULE:FREQ=WEEKLY;BYDAY=FR",
    exdates: [],
    startTime: "19:00",
    endTime: "21:00",
    tz: TZ,
    locationText: "Sporthal",
    lat: null,
    lng: null,
    notes: null,
    origin: "scrape",
    confidence: 0.9,
    extractorVersion: 1,
    status: "published",
    locked: false,
    validFrom: null,
    validUntil: null,
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("expandOpenGym", () => {
  it("renders a 19:00 local weekly gym at 19:00 local on BOTH sides of the late-March DST switch", () => {
    // NL DST 2025: clocks jump forward on Sun 30 March 2025.
    // Window covers Fridays 28 Mar (CET, +01:00) and 4 Apr (CEST, +02:00).
    const gym = makeGym();
    const start = new Date("2025-03-21T00:00:00Z");
    const end = new Date("2025-04-11T00:00:00Z");

    const occ = expandOpenGym(gym, start, end);
    const fridays = occ.map((o) =>
      formatInTimeZone(new Date(o.startsAt), TZ, "yyyy-MM-dd HH:mm")
    );

    expect(fridays).toContain("2025-03-28 19:00"); // before DST (CET)
    expect(fridays).toContain("2025-04-04 19:00"); // after DST (CEST)

    // Verify the actual offsets differ across the boundary.
    const before = occ.find((o) => o.startsAt.startsWith("2025-03-28"))!;
    const after = occ.find((o) => o.startsAt.startsWith("2025-04-04"))!;
    expect(before.startsAt).toBe("2025-03-28T19:00:00+01:00");
    expect(after.startsAt).toBe("2025-04-04T19:00:00+02:00");

    // End times also respect local wall-clock.
    expect(before.endsAt).toBe("2025-03-28T21:00:00+01:00");
    expect(after.endsAt).toBe("2025-04-04T21:00:00+02:00");
  });

  it("removes an occurrence covered by an EXDATE", () => {
    const gym = makeGym({ exdates: ["2025-04-04T00:00:00+02:00"] });
    const start = new Date("2025-03-21T00:00:00Z");
    const end = new Date("2025-04-11T00:00:00Z");

    const occ = expandOpenGym(gym, start, end);
    const days = occ.map((o) => o.startsAt.slice(0, 10));

    expect(days).toContain("2025-03-28");
    expect(days).not.toContain("2025-04-04"); // excluded
  });

  it("emits a single occurrence for a one-off gym (no rrule, uses validFrom)", () => {
    const gym = makeGym({
      rrule: null,
      validFrom: "2025-06-13T00:00:00+02:00",
    });
    const occ = expandOpenGym(
      gym,
      new Date("2025-06-01T00:00:00Z"),
      new Date("2025-06-30T00:00:00Z")
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAt).toBe("2025-06-13T19:00:00+02:00");
  });
});

describe("buildWeeklyRRule", () => {
  it("builds a weekly RRULE for the given weekday (0=Mon)", () => {
    const rule = buildWeeklyRRule(4); // Friday
    expect(rule).toContain("FREQ=WEEKLY");
    expect(rule).toContain("FR");
  });
});
