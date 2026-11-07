"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { History, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatItem {
  threadId: string;
  title: string;
  createdAt: string;
}

export default function Sidebar({
  className = "",
  onItemClick,
}: {
  className?: string;
  onItemClick?: () => void;
}) {
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeThreadId = searchParams.get("threadId");

  const email = searchParams.get("email") || "guest@example.com";
  const username = searchParams.get("username") || "guest";
  const fullname = searchParams.get("fullname") || "Guest User";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat-history?email=${email}`);
        const data = await res.json();
        setChatHistory(data);
      } catch (err) {
        console.error("Failed to fetch chat history", err);
      }
    };

    fetchHistory();
  }, [email]);

  const handleNewChat = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("threadId");
    router.push(`/?${params.toString()}`);
    onItemClick?.();
  };

  return (
    <aside
      className={cn(
        "glass-panel flex h-full min-h-0 w-full max-w-xs flex-col overflow-hidden rounded-[30px] border border-white/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)]",
        className
      )}
    >
      <div className="mb-4 mt-8 rounded-[24px] bg-slate-950 px-4 py-4 text-white md:mt-0">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold uppercase">
            {fullname
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullname}</p>
            <p className="truncate text-xs text-slate-300">@{username}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">
          <Sparkles size={12} />
          Guided care chat
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <History size={16} className="text-sky-600" />
            Chat history
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Re-open previous conversations
          </p>
        </div>
        <button
          onClick={handleNewChat}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-sky-600 px-4 text-sm font-medium text-white shadow-[0_16px_35px_rgba(2,132,199,0.32)] transition duration-200 hover:-translate-y-0.5 hover:bg-sky-700"
        >
          <Plus size={15} />
          New
        </button>
      </div>

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {chatHistory.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-sky-200 bg-white/55 px-4 py-5 text-sm italic text-slate-500">
            No previous chats found yet.
          </div>
        )}

        {Array.isArray(chatHistory) &&
          chatHistory.map((chat) => {
            const isActive = activeThreadId === chat.threadId;

            return (
              <Link
                key={chat.threadId}
                href={`/?threadId=${chat.threadId}&email=${email}&username=${username}&fullname=${fullname}`}
                className={cn(
                  "group block rounded-[22px] border p-3 transition duration-200",
                  isActive
                    ? "border-sky-200 bg-white shadow-[0_18px_45px_rgba(14,165,233,0.12)]"
                    : "border-white/70 bg-white/60 hover:-translate-y-0.5 hover:bg-white"
                )}
                onClick={() => onItemClick?.()}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                      isActive
                        ? "bg-sky-600 text-white"
                        : "bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white"
                    )}
                  >
                    <MessageSquareText size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {chat.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(chat.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </aside>
  );
}
