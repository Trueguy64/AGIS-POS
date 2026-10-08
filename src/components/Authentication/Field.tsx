import type { ReactNode } from "react";

type Props = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode; // the <input> or <select>
};

export const authInput = "h-11 w-full rounded-slip border border-brass-300 bg-slip px-3 font-semibold text-ink focus:border-brass-700 focus:outline-none";

/** Labelled form field used by the login and register slips. */
export default function Field({ label, hint, error, children }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-ink-soft">
        {label}{hint && <span className="font-normal text-ink-muted"> · {hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block rounded-slip bg-stamp-tint px-3 py-2 text-stamp" role="alert">{error}</span>}
    </label>
  );
}
