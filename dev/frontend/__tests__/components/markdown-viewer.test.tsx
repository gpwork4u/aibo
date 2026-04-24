import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownViewer } from "@/components/markdown-viewer";

describe("MarkdownViewer", () => {
  it("renders headings and paragraphs", () => {
    render(<MarkdownViewer content={"# Hello\n\nworld"} data-testid="md" />);
    expect(screen.getByRole("heading", { level: 1, name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("renders fenced code blocks as <pre><code>", () => {
    const md = "```go\nfmt.Println(\"hi\")\n```";
    const { container } = render(<MarkdownViewer content={md} />);
    const pre = container.querySelector("pre");
    const code = container.querySelector("pre code");
    expect(pre).toBeTruthy();
    expect(code).toBeTruthy();
    expect(code?.textContent).toContain('fmt.Println("hi")');
  });

  it("renders GFM tables via remark-gfm", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const { container } = render(<MarkdownViewer content={md} />);
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("th")?.textContent).toBe("a");
  });

  it("forwards data-testid", () => {
    render(<MarkdownViewer content="hi" data-testid="md-root" />);
    expect(screen.getByTestId("md-root")).toBeInTheDocument();
  });
});
