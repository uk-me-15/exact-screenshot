import { createFileRoute } from "@tanstack/react-router";
import Landing from "@/components/medikiosk/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediKiosk — Voice-first OPD check-in for Indian clinics" },
      {
        name: "description",
        content:
          "MediKiosk collects a patient's history by voice in their own language, flags emergencies with deterministic rules, and hands a structured record to the doctor.",
      },
      { property: "og:title", content: "MediKiosk — Voice-first OPD check-in" },
      {
        property: "og:description",
        content:
          "Voice-first patient intake in Indian languages, with red-flag safety rules and a real doctor queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
