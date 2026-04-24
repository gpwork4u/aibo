"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  "data-testid"?: string;
}

export function MarkdownViewer({
  content,
  className,
  "data-testid": dataTestId,
}: MarkdownViewerProps) {
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
