import { createFileRoute } from "@tanstack/react-router";
import { KioskFlow } from "@/components/medikiosk/kiosk";

export const Route = createFileRoute("/kiosk")({
  head: () => ({
    meta: [
      { title: "Patient check-in — MediKiosk" },
      {
        name: "description",
        content:
          "Check in for your consultation: choose your language, answer a few spoken questions and share your history with the doctor.",
      },
      { property: "og:title", content: "Patient check-in — MediKiosk" },
      {
        property: "og:description",
        content: "Voice-first OPD check-in in your own language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KioskFlow,
});
