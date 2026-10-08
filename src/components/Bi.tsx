import { S, type StrKey } from "../lib/i18n";

type Props = {
  k: StrKey;
  /** English on its own line beneath, in compact weight, for headings and big buttons. */
  stack?: boolean;
  /** Thai only (English carried by aria-label elsewhere), for tight spots. */
  thOnly?: boolean;
  className?: string;
};

/** A bilingual label: Thai first, English second in a quieter weight. */
export default function Bi({ k, stack = false, thOnly = false, className = "" }: Props) {
  const [thai, english] = S[k];
  if (thOnly) return <span lang="th" className={className}>{thai}</span>;
  if (stack) {
    return (
      <span className={`inline-flex flex-col items-start leading-tight ${className}`}>
        <span lang="th">{thai}</span>
        <span lang="en" className="text-compact font-normal opacity-80">{english}</span>
      </span>
    );
  }
  return (
    <span className={className}>
      <span lang="th">{thai}</span>
      <span lang="en" className="ms-1.5 font-normal text-ink-muted">{english}</span>
    </span>
  );
}
