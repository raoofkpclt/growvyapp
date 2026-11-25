export const ID_PROOF_TYPES = [
  "aadhaar",
  "pan",
  "driving_licence",
  "passport",
  "voter_id",
  "other",
] as const;

export type IdProofType = (typeof ID_PROOF_TYPES)[number];

export const ID_PROOF_LABELS: Record<IdProofType, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  driving_licence: "Driving licence",
  passport: "Passport",
  voter_id: "Voter ID",
  other: "Other",
};

// returns an error message, or "" if OK
export const validateIdNumber = (type: IdProofType, raw: string): string => {
  const v = raw.replace(/\s+/g, "").toUpperCase();
  if (!v) return "ID number is required.";
  switch (type) {
    case "aadhaar":
      return /^\d{12}$/.test(v) ? "" : "Aadhaar must be 12 digits.";
    case "pan":
      return /^[A-Z]{5}\d{4}[A-Z]$/.test(v) ? "" : "PAN format is invalid (e.g. ABCDE1234F).";
    case "passport":
      return /^[A-PR-WY][1-9]\d{6}[1-9]$/.test(v) ? "" : "Passport number format is invalid.";
    default:
      return v.length >= 5 ? "" : "ID number looks too short.";
  }
};

export const maskId = (n: string) =>
  n.length > 4 ? "•".repeat(n.length - 4) + n.slice(-4) : n;