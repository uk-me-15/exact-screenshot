import { createFileRoute } from "@tanstack/react-router";
import { PhysicianConsole } from "@/components/medikiosk/physician";

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor console — MediKiosk" },
      {
        name: "description",
        content:
          "Review the live patient queue, structured intake answers, attached documents and red-flag alerts from the MediKiosk check-in.",
      },
      { property: "og:title", content: "Doctor console — MediKiosk" },
      {
        property: "og:description",
        content: "Live patient queue and structured intake records for clinicians.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhysicianConsole,
});
