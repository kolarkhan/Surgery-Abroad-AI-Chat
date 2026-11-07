import { Card, CardContent } from "@/components/ui/card";
import { Message as MessageProps } from "ai";
import Image from "next/image";
import avatar from "@/public/avatar.png";
import FileAttachment from "./FileAttachment";
import MarkdownRenderer from "./MarkdownRenderer";
import { cn } from "@/lib/utils";

const cleanAssistantResponse = (response: string): string => {
  const annotationRegex = /ã€\d+:\d+â€ sourceã€‘|ã€\d+:\d+â€ sourceã€‘/g;
  return response.replace(annotationRegex, "").trim();
};

const Message = ({ message }: { message: MessageProps & { files?: any[] } }) => {
  const isAssistant = message.role === "assistant" || message.role === "data";
  const cleanedContent = isAssistant
    ? cleanAssistantResponse(message.content)
    : message.content;

  return (
    <div
      className={cn(
        "flex w-full items-end gap-3 animate-fadeIn",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
          <Image
            src={avatar}
            alt="assistant avatar"
            className="h-full w-full object-cover"
            width={44}
            height={44}
          />
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[88%] flex-col gap-2 sm:max-w-[80%]",
          isAssistant ? "items-start" : "items-end"
        )}
      >
        <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {isAssistant ? "Assistant" : "You"}
        </span>
        <Card
          className={cn(
            "w-full rounded-[26px] border px-2 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-transform duration-200",
            isAssistant
              ? "border-white/70 bg-white/85 text-card-foreground"
              : "border-primary/20 bg-gradient-to-br from-sky-500 via-sky-600 to-cyan-500 text-white"
          )}
        >
          <CardContent className="flex flex-col gap-3 p-4">
            <MarkdownRenderer
              markdown={cleanedContent}
              className={cn(
                "prose-sm max-w-none md:prose-base",
                isAssistant
                  ? "prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-a:text-sky-700"
                  : "prose-invert prose-headings:text-white prose-p:text-white/95 prose-strong:text-white prose-a:text-white"
              )}
            />

            {message.files && message.files.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-white/20 pt-3">
                {message.files.map((file, index) => (
                  <FileAttachment
                    key={index}
                    fileId={file.id || index.toString()}
                    fileName={file.name}
                    fileType={file.type}
                    url={file.url}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Message;
