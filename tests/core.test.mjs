import assert from "node:assert/strict";
import { test } from "node:test";
import { SnapshotHistory } from "../src/core/history.ts";
import {
  normalizeBrushSettings,
  readBrushSettings,
  saveBrushSettings,
  DEFAULT_BRUSH_SETTINGS,
} from "../src/core/brushSettings.ts";
import Arrow from "../src/core/objects/Arrow.ts";
import { classRegistry } from "fabric";

test("history returns to initial state, truncates redo and bounds memory", () => {
  const h = new SnapshotHistory("empty", 2);
  assert.equal(h.canUndo, false);
  h.push("a");
  h.push("b");
  h.move(-1);
  assert.equal(h.current, "a");
  assert.equal(h.canRedo, true);
  assert.equal(h.push("a"), false);
  assert.equal(h.canRedo, true);
  h.push("c");
  assert.equal(h.canRedo, false);
  h.move(-1);
  h.move(-1);
  assert.equal(h.current, "empty");
  h.move(1);
  h.move(1);
  h.push("d");
  h.move(-1);
  h.move(-1);
  h.move(-1);
  assert.equal(h.current, "a");
  assert.equal(h.canUndo, false);
});

test("settings sanitize corrupt or out-of-range saved values", () => {
  assert.deepEqual(normalizeBrushSettings(null), DEFAULT_BRUSH_SETTINGS);
  assert.deepEqual(
    normalizeBrushSettings({ color: "#AABBCC", width: 90, eraserWidth: -3, fontSize: 200 }),
    { color: "#aabbcc", width: 40, fontSize: 96 },
  );
  assert.deepEqual(
    normalizeBrushSettings({ color: "url(x)", width: NaN, eraserWidth: "20" }),
    DEFAULT_BRUSH_SETTINGS,
  );
  assert.deepEqual(readBrushSettings(), DEFAULT_BRUSH_SETTINGS);
  assert.doesNotThrow(() => saveBrushSettings(DEFAULT_BRUSH_SETTINGS));
});

test("arrow survives JSON restoration and clone", async () => {
  const arrow = new Arrow([10, 20, 80, 90], { stroke: "#ff0000", strokeWidth: 5 });
  const json = arrow.toObject();
  assert.equal(json.type, "Arrow");
  const restored = await classRegistry.getClass(json.type).fromObject(json);
  assert.ok(restored instanceof Arrow);
  assert.equal(restored.stroke, "#ff0000");
  assert.deepEqual(restored.toObject(), json);
  assert.ok((await arrow.clone()) instanceof Arrow);
});
