import test from "node:test";
import assert from "node:assert/strict";
import { buildTestimonyPrintHtml } from "./testimonyPrint.js";

const testimony = { title: "Healing", createdBy: "Member", english: "English testimony\nSecond paragraph", hindi: "विश्वास और चंगाई" };

test("prints only supplied testimonies, with both languages and preserved paragraphs", () => {
  const html = buildTestimonyPrintHtml([testimony]);
  assert.equal((html.match(/<article>/g) || []).length, 1);
  assert.ok(html.includes("1 selected testimony"));
  assert.ok(html.includes(testimony.english));
  assert.ok(html.includes(testimony.hindi));
  assert.ok(html.includes("white-space: pre-wrap"));
});

test("respects the selected language and explains missing translations", () => {
  const english = buildTestimonyPrintHtml([testimony], "en");
  assert.ok(english.includes(testimony.english));
  assert.ok(!english.includes(testimony.hindi));
  const hindi = buildTestimonyPrintHtml([testimony], "hi");
  assert.ok(hindi.includes(testimony.hindi));
  assert.ok(!hindi.includes(testimony.english));
  assert.ok(buildTestimonyPrintHtml([{}], "hi").includes("Hindi testimony is not available yet."));
});

test("treats testimony content and metadata as text rather than executable HTML", () => {
  const content = '<script>alert("test")</script> & <img src=x onerror=alert(1)>';
  const html = buildTestimonyPrintHtml([{ title: content, createdBy: content, english: content, hindi: content }]);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.equal((html.match(/&lt;script&gt;/g) || []).length, 4);
});
