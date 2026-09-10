import { motion } from "framer-motion";
import {
  Brain,
  CheckCircle2,
  FileText,
  Languages,
  Lock,
  MousePointerClick,
  Server,
  ShieldCheck,
  Volume2,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { a11yPersonaRows } from "@/lib/kiosk-data";
import { cn } from "@/lib/utils";

function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55 }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
        {kicker}
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
        {title}
      </h2>
      {sub ? <p className="mt-3 text-base text-slate-500">{sub}</p> : null}
    </div>
  );
}

const PERSONA_CARDS = [
  {
    icon: Volume2,
    title: "Voice-first",
    body: "Speaks every question aloud, in the patient's own language, at a pace they control.",
  },
  {
    icon: MousePointerClick,
    title: "48px+ touch targets",
    body: "Large icon buttons, no typing required, tremor- and literacy-friendly by design.",
  },
  {
    icon: ShieldCheck,
    title: "Zero-retention kiosk",
    body: "Every session wipes itself. Nothing about the patient stays on the machine.",
  },
];

export function Personas() {
  return (
    <section
      id="personas"
      className="scroll-mt-20 bg-slate-950 py-20 text-slate-200 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-400">
            Who it serves
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Designed for the patients the system forgets
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Mobile apps and manual registration desks fail the people who visit public
            OPDs the most. MediKiosk starts where they are.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
          <div className="grid grid-cols-3 border-b border-slate-800">
            <div className="px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Patient situation
            </div>
            <div className="border-l border-slate-800 px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Mobile app / manual desk
            </div>
            <div className="border-l border-slate-800 px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-teal-400">
              MediKiosk
            </div>
          </div>
          {a11yPersonaRows.map((row) => (
            <div
              key={row.situation}
              className="grid grid-cols-3 border-b border-slate-800/70 last:border-b-0"
            >
              <div className="px-5 py-4 text-sm font-medium text-slate-300">
                {row.situation}
              </div>
              <div className="border-l border-slate-800 px-5 py-4 text-sm text-slate-500">
                <X className="mr-1.5 inline size-3.5 text-red-400/70" />
                {row.statusQuo}
              </div>
              <div className="border-l border-slate-800 px-5 py-4 text-sm text-slate-200">
                <CheckCircle2 className="mr-1.5 inline size-3.5 text-teal-400" />
                {row.medikiosk}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PERSONA_CARDS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works — 4-step journey                                       */
/* ------------------------------------------------------------------ */

import { Card, CardContent } from "@/components/ui/card";
import { Fingerprint, Mic, ScanLine } from "lucide-react";

const HOW_STEPS = [
  {
    icon: Fingerprint,
    title: "Check in with ABHA",
    body: "Tap in, verify once, demographics confirmed in seconds. The ABHA number stays masked on screen.",
    accent: "bg-teal-600",
  },
  {
    icon: Mic,
    title: "Talk or tap your complaint",
    body: "Voice-first in 8 languages, or big icon buttons. SOCRATES and AYUSH Pariksha branches fill in as the AI nurse listens.",
    accent: "bg-teal-700",
  },
  {
    icon: ScanLine,
    title: "Show your old papers",
    body: "Handwritten prescriptions and lab reports are OCR-read on the spot — drugs, doses and out-of-range values highlighted.",
    accent: "bg-amber-500",
  },
  {
    icon: ShieldCheck,
    title: "Consent & handoff",
    body: "A plain-language DPDP/ABDM consent, optional audio explanation, then a clean handoff to the doctor's screen.",
    accent: "bg-slate-900",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="How it works"
            title={
              <>
                Four taps between the queue and the{" "}
                <span className="text-teal-700">consultation</span>
              </>
            }
            sub="The same journey patients walk through on the kiosk — try each step live in the demo."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map((step, i) => (
            <Reveal key={step.title}>
              <Card className="h-full rounded-2xl border-slate-200 shadow-sm transition hover:border-teal-300 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl text-white",
                        step.accent,
                      )}
                    >
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-display text-4xl font-semibold text-slate-100">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
