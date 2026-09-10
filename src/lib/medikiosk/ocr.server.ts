/**
 * Document OCR provider interface.
 *
 * The mock provider does NOT read the file. It records that the document was
 * received and marks it as awaiting a real OCR provider. Nothing invented by
 * this module is ever presented to a doctor as extracted clinical data.
 */

export interface OcrResult {
  provider: string;
  status: "PENDING" | "PROCESSED" | "UNSUPPORTED" | "FAILED";
  text: string | null;
  structured: Record<string, unknown> | null;
  confidence: number | null;
}

export interface OcrProvider {
  readonly name: string;
  process(input: { fileName: string; fileType: string; bytes: Uint8Array }): Promise<OcrResult>;
}

/** Text files really are read. Anything else is honestly marked unprocessed. */
export class MockOcrProvider implements OcrProvider {
  readonly name = "mock-ocr (no OCR engine configured)";

  async process(input: { fileName: string; fileType: string; bytes: Uint8Array }): Promise<OcrResult> {
    if (input.fileType.startsWith("text/")) {
      const text = new TextDecoder().decode(input.bytes).slice(0, 4000);
      return {
        provider: this.name,
        status: "PROCESSED",
        text,
        structured: null,
        confidence: 1,
      };
    }
    return {
      provider: this.name,
      status: "UNSUPPORTED",
      text: null,
      structured: null,
      confidence: null,
    };
  }
}

export const ocrProvider: OcrProvider = new MockOcrProvider();

export function classifyDocument(fileName: string): string {
  const n = fileName.toLowerCase();
  if (/(lab|report|cbc|blood|test|path)/.test(n)) return "LAB_REPORT";
  if (/(rx|prescription|presc)/.test(n)) return "PRESCRIPTION";
  if (/(xray|x-ray|scan|mri|ct|usg|radio)/.test(n)) return "IMAGING";
  if (/(discharge|summary)/.test(n)) return "DISCHARGE_SUMMARY";
  if (/(abha|aadhaar|id)/.test(n)) return "ID_DOCUMENT";
  return "OTHER";
}
