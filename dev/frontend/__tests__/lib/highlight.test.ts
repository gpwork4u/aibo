import { describe, it, expect } from "vitest";
import { escapeHtml, highlightKeywords } from "@/lib/highlight";

describe("escapeHtml", () => {
  it("escapes HTML special chars", () => {
    expect(escapeHtml("<div>&\"'</div>")).toBe(
      "&lt;div&gt;&amp;&quot;&#39;&lt;/div&gt;",
    );
  });
});

describe("highlightKeywords", () => {
  it("wraps matched keywords with <mark> (case-insensitive)", () => {
    const out = highlightKeywords("Hello Golang, hello world", ["hello"]);
    expect(out).toMatch(/<mark[^>]*>Hello<\/mark>/);
    expect(out).toMatch(/<mark[^>]*>hello<\/mark>/);
  });

  it("escapes HTML and only inserts <mark>", () => {
    const out = highlightKeywords("<script>a</script> go", ["go"]);
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toMatch(/<mark[^>]*>go<\/mark>/);
  });

  it("returns escaped original text when keywords empty", () => {
    expect(highlightKeywords("<b>x</b>", [])).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(highlightKeywords("<b>x</b>", undefined)).toBe("&lt;b&gt;x&lt;/b&gt;");
  });

  it("sorts keywords by length desc to prioritize longest match", () => {
    // "go" 與 "goroutine" 共存：應優先匹配長詞
    const out = highlightKeywords("goroutine go", ["go", "goroutine"]);
    expect(out).toMatch(/<mark[^>]*>goroutine<\/mark>/);
    // 後面那個單獨 go 也該被標記
    const marks = out.match(/<mark[^>]*>[^<]+<\/mark>/g) ?? [];
    expect(marks.length).toBe(2);
  });

  it("escapes regex metacharacters in keywords", () => {
    const out = highlightKeywords("a.b a+b", ["a.b"]);
    // 不應誤把 "a+b" 當成 regex `a.b` 匹配
    expect(out).toMatch(/<mark[^>]*>a\.b<\/mark>/);
    expect(out).not.toMatch(/<mark[^>]*>a\+b<\/mark>/);
  });
});
