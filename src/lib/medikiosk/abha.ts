/**
 * ABHA / patient identification service.
 *
 * IMPORTANT: no government system is contacted in this prototype. The mock
 * provider validates the shape of an ABHA number and masks it for display —
 * nothing more. Every screen that uses it must say "Demo ABHA verification".
 */

import type { IdentityVerification, PatientIdentity } from "./types";

export interface ABHAVerificationInput {
  name: string;
  age: number;
  sex: PatientIdentity["sex"];
  abhaNumber?: string;
}

export interface ABHAVerificationResult {
  ok: boolean;
  error?: string;
  patient?: PatientIdentity;
  verification?: IdentityVerification;
}

export interface ABHAService {
  readonly providerName: string;
  readonly isMock: boolean;
  verify(input: ABHAVerificationInput): Promise<ABHAVerificationResult>;
}

function maskAbha(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `ABHA •••• •••• ${digits.slice(-4)}`;
}

export class MockABHAService implements ABHAService {
  readonly providerName = "Demo ABHA verification (no ABDM call)";
  readonly isMock = true;

  async verify(input: ABHAVerificationInput): Promise<ABHAVerificationResult> {
    const name = input.name.trim();
    if (name.length < 2) return { ok: false, error: "Please enter the patient's name." };
    if (!Number.isFinite(input.age) || input.age < 0 || input.age > 120) {
      return { ok: false, error: "Please enter a valid age." };
    }

    let masked: string | null = null;
    if (input.abhaNumber && input.abhaNumber.trim()) {
      const digits = input.abhaNumber.replace(/\D/g, "");
      if (digits.length !== 14) {
        return { ok: false, error: "An ABHA number has 14 digits. Leave it blank to continue without one." };
      }
      masked = maskAbha(digits);
    }

    // Simulated latency only — no network call is made.
    await new Promise((r) => setTimeout(r, 500));

    return {
      ok: true,
      patient: { name, age: Math.round(input.age), sex: input.sex, abhaMasked: masked },
      verification: {
        provider: this.providerName,
        mode: "demo",
        verifiedAt: new Date().toISOString(),
        reference: null,
      },
    };
  }
}

/**
 * Swap this for a RealABHAService once ABDM credentials exist. The kiosk flow
 * only depends on the ABHAService interface.
 */
export const abhaService: ABHAService = new MockABHAService();
