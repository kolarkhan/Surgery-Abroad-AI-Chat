import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MarkdownRenderer = ({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  return (
    <ReactMarkdown
      className={cn(
        "prose max-w-full break-words prose-p:leading-relaxed prose-pre:overflow-hidden prose-pre:rounded-2xl prose-pre:border prose-pre:border-white/10 prose-pre:p-0 dark:prose-invert",
        className
      )}
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");

          if (!inline && match) {
            return (
              <div className="relative group">
                <div className="absolute right-2 top-2">
                  <Button
                    onClick={() => copyToClipboard(code)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full border border-white/10 bg-slate-950/60 text-white hover:bg-slate-800"
                  >
                    {copiedCode === code ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
                <SyntaxHighlighter
                  style={atomDark as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0 }}
                  showLineNumbers
                  showInlineLineNumbers
                  {...props}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code
              className={cn(
                "rounded-md bg-slate-950/10 px-1.5 py-0.5 font-mono text-[0.9em]",
                className
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
