#!/usr/bin/env bash
# Usage: round.sh <impeccable-command> [extra instructions...]  -> MiniMax log at .impeccable/loop/<n>-<cmd>.log
set -u
cd "$(dirname "$0")/../.."
CMD="$1"; shift; EXTRA="$*"
N=$(ls .impeccable/loop/*.log 2>/dev/null | wc -l); LOG=".impeccable/loop/$((N+1))-$CMD.log"
MINIMAX_AGENT= MINIMAX_TOOLS="Read,Grep,Glob,Bash,Edit,Write,Skill" bash ~/.claude/minimax-run.sh --output-format json > "$LOG" 2>&1 <<TASK
Project: AGIS, a Thai gold-shop POS (React 19 + Vite + Tailwind 4; Express + Prisma 7 server in server/).
Read PRODUCT.md, DESIGN.md and the newest file in .impeccable/audit/ first.

Load the impeccable skill and run exactly ONE command: $CMD.
Address the audit findings that command covers. Keep the existing design system
(tokens, Dialog, Bi, strings in src/lib/i18n.ts). Do not redesign.
$EXTRA

Rules:
- Do not touch server/.env, server/dev.db, git, or anything outside the project.
- Schema changes: edit schema.prisma and run prisma generate only; never migrate.
- Thai copy review (audit P1) needs a native speaker: do not rewrite Thai strings.
- crypto.randomUUID is unavailable on the plain-http tablets; use newSaleKey() style getRandomValues if you need ids.
- Finish with: npx tsc -b, npx eslint ., npm run build, and (cd server && npx tsc --noEmit). Fix what you broke.

Output: command run; audit findings addressed (by title); files changed; anything skipped and why;
the exact result of each check.
TASK
echo "exit=$?" >> "$LOG"
