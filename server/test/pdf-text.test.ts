// server/test/pdf-text.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { newPdf, write } from "../src/lib/pdfText";

test("right-aligned mixed Thai and Latin text is placed as one line ending at the right edge", () => {
  const { doc } = newPdf();
  const span = write(doc, "สมชาย John Doe", 100, 50, { width: 300, align: "right" });
  assert.ok(Math.abs(span.end - 400) < 0.01, `ends at ${span.end}`);
  assert.ok(span.start > 100 && span.start < 400);
  doc.end();
});
