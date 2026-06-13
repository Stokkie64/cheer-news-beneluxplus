import { describe, it, expect } from "vitest";
import { parseJsonLdEvents } from "@/lib/extract";

const SOURCE = "https://www.myclub.nl/events";

// A future date kept within the validation window relative to test run time.
const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

describe("parseJsonLdEvents", () => {
  it("parses a single schema.org/Event JSON-LD block", () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Dutch Open Championship",
        "startDate": "${FUTURE}T10:00:00+02:00",
        "endDate": "${FUTURE}T18:00:00+02:00",
        "description": "National cheer competition.",
        "url": "https://www.myclub.nl/events/dutch-open",
        "location": {
          "@type": "Place",
          "name": "Topsporthal Almere",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Pierre de Coubertinlaan 4",
            "addressLocality": "Almere"
          }
        },
        "offers": { "@type": "Offer", "url": "https://www.eventbrite.nl/e/123" }
      }
      </script>
      </head><body></body></html>`;

    const events = parseJsonLdEvents(html, SOURCE);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.title).toBe("Dutch Open Championship");
    expect(e.type).toBe("competition");
    expect(e.start).toContain(FUTURE);
    expect(e.location.name).toBe("Topsporthal Almere");
    expect(e.location.address).toContain("Almere");
    expect(e.extractionMethod).toBe("json-ld");
    expect(e.confidence).toBeGreaterThan(0.9);
    // ticket URL from offers is allowlisted (eventbrite) and kept.
    expect(e.ticketUrl).toContain("eventbrite.nl");
    // same-domain url kept.
    expect(e.url).toContain("myclub.nl");
  });

  it("handles @graph arrays and multiple events", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", "name": "Club" },
          {
            "@type": "Event",
            "name": "Open Gym Friday",
            "startDate": "${FUTURE}T19:00:00+02:00",
            "location": "Club Hall"
          },
          {
            "@type": "SportsEvent",
            "name": "Spring Clinic",
            "startDate": "${FUTURE}T09:00:00+02:00",
            "location": "Club Hall"
          }
        ]
      }
      </script>`;

    const events = parseJsonLdEvents(html, SOURCE);
    expect(events).toHaveLength(2);
    const titles = events.map((e) => e.title);
    expect(titles).toContain("Open Gym Friday");
    expect(titles).toContain("Spring Clinic");
    const gym = events.find((e) => e.title === "Open Gym Friday")!;
    expect(gym.type).toBe("open_gym");
    expect(gym.location.name).toBe("Club Hall");
  });

  it("returns [] when there is no Event JSON-LD", () => {
    const html = `<html><body><p>No structured data here.</p></body></html>`;
    expect(parseJsonLdEvents(html, SOURCE)).toEqual([]);
  });

  it("skips malformed JSON-LD blocks without throwing", () => {
    const html = `
      <script type="application/ld+json">{ not valid json </script>
      <script type="application/ld+json">
      { "@type": "Event", "name": "Good One", "startDate": "${FUTURE}T10:00:00+02:00", "location": "Hall" }
      </script>`;
    const events = parseJsonLdEvents(html, SOURCE);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Good One");
  });
});
