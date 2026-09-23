import assert from "node:assert/strict";
import { test } from "node:test";
import { simulatePreviewTransport } from "../src/utils/previewSync.ts";

test("preview survives gzip, Base64 and JSON with Unicode content", () => {
  const snapshot = { objects: [{ type: "IText", text: "互动白板 🎨" }], background: "示例课件" };
  const restored = simulatePreviewTransport(snapshot);
  assert.deepEqual(restored, snapshot);
  assert.notEqual(restored, snapshot);
});
