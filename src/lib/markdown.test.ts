import { describe, it, expect } from "vitest";
import { wordCount, render, highlight } from "./markdown";

describe("wordCount", () => {
  it("counts words, ignoring markdown punctuation", () => {
    expect(wordCount("# Hello **world**")).toBe(2);
  });
  it("returns 0 for empty/blank input", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n  ")).toBe(0);
  });
});

describe("render", () => {
  it("renders a heading and escapes HTML", () => {
    const html = render("# Title\n\n<script>alert(1)</script>");
    expect(html).toContain("Title");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("turns wikilinks into anchors with the target in a data attribute", () => {
    const html = render("See [[Other Note]] here");
    expect(html).toContain('data-wikilink="Other Note"');
  });
});

describe("highlight", () => {
  it("wraps headings in a highlight span", () => {
    expect(highlight("# Heading")).toContain("t-head");
  });
});
