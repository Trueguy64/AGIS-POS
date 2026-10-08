/** The typographic AGIS wordmark: stands in for a logo mark until one exists. */
export default function Wordmark({ onBrass = false, word = "Gold" }: { onBrass?: boolean; word?: string }) {
  return (
    <span className="inline-flex items-baseline gap-2" aria-label={`AGIS ${word}`}>
      <span className={`text-display font-bold leading-none tracking-tight ${onBrass ? "text-slip" : "text-ink"}`}>AGIS</span>
      <span className={`font-semibold leading-none ${onBrass ? "text-brass-100" : "text-brass-800"}`}>{word}</span>
    </span>
  );
}
