import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediKioskLogo } from "@/components/medikiosk/ui";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? (search["next"] as string) : "/doctor",
  }),
  head: () => ({
    meta: [
      { title: "Staff sign in — MediKiosk" },
      {
        name: "description",
        content: "Clinicians sign in here to open the MediKiosk patient queue and intake records.",
      },
      { property: "og:title", content: "Staff sign in — MediKiosk" },
      { property: "og:description", content: "Sign in to the MediKiosk doctor console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/doctor";
}

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const destination = safeNext(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${destination}` },
        });
        if (signUpError) throw signUpError;
        setMessage("Account created. Check your inbox if confirmation is required, then sign in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        void navigate({ to: destination, replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/60 p-7">
        <Link to="/" className="flex items-center gap-2.5">
          <MediKioskLogo size={26} />
          <span className="font-display text-lg font-semibold text-slate-100">MediKiosk</span>
        </Link>
        <h1 className="mt-6 font-display text-xl font-semibold text-slate-100">
          {mode === "signin" ? "Staff sign in" : "Create a staff account"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          The patient kiosk does not need an account — only the doctor console does.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {message ? <p className="text-sm text-teal-300">{message}</p> : null}
          <Button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full gap-2 bg-teal-600 text-white hover:bg-teal-500"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-200"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "New staff member? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
