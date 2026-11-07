"use client";

declare global {
  interface Window {
    MSStream?: any;
    __iosUnlockedAudio__?: HTMLAudioElement;
  }
}

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import debounce from "lodash/debounce";
import { useAssistant } from "ai/react";
import { useSearchParams } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import {
  ArrowRight,
  Loader,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useEnterSubmit } from "@/lib/hooks/useEnterSubmit";
import { useScrollToBottom } from "@/lib/hooks/useScrollToBottom";
import { useQuestionSubmit } from "@/lib/hooks/useQuestionSubmit";
import { AssistantDataMessageClient } from "../types/data-message";
import FileUpload from "./FileUpload";
import InitialQuestions from "./InitialQuestions";
import Message from "./Message";
import PossibleQuestions from "./PossibleQuestions";
import Sidebar from "./Sidebar";
import TooltipButton from "./TooltipButton";
import VoiceInput from "./VoiceInput";

export default function Chat() {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [possibleQuestionsMessage, setPossibleQuestionsMessage] = useState<
    string | undefined
  >();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const mediaReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const playbackSessionRef = useRef(0);
  const lastSyncedThreadIdRef = useRef<string | null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const { triggerScrollToBottom } = useScrollToBottom(divRef);
  const searchParams = useSearchParams();
  const queryThreadId = searchParams.get("threadId") || "";

  const email = searchParams.get("email") || "guest@example.com";
  const username = searchParams.get("username") || "guest";
  const fullname = searchParams.get("fullname") || "Guest User";

  const { formRef, onKeyDown } = useEnterSubmit();
  const {
    input,
    messages,
    status,
    threadId,
    setInput,
    submitMessage,
    handleInputChange,
    setMessages,
    setThreadId,
  } = useAssistant({ api: "/api/assistant" });
  const { handleQuestionClick, setQuestionSelected } = useQuestionSubmit(
    submitMessage,
    setInput
  );

  const isAwaitingMessage = status === "awaiting_message";

  const isIOS = () => {
    if (typeof window === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  const clearAudio = () => {
    playbackSessionRef.current += 1;

    if (mediaReaderRef.current) {
      void mediaReaderRef.current.cancel().catch(() => {});
      mediaReaderRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const toggleVoicePlayback = async (id: string) => {
    if (speakingMessageId !== id || !audioRef.current) {
      return;
    }

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPaused(false);
      } else {
        audioRef.current.pause();
        setIsPaused(true);
      }
    } catch (error) {
      console.error("Audio toggle error:", error);
    }
  };

  const playRealisticVoice = async (text: string, id: string) => {
    clearAudio();
    const sessionId = playbackSessionRef.current;

    try {
      setLoadingAudioId(id);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: "Kore",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Gemini audio: ${response.status}`);
      }

      const audio = isIOS() && window.__iosUnlockedAudio__ ? window.__iosUnlockedAudio__ : new Audio();

      audioRef.current = audio;
      setSpeakingMessageId(id);
      setIsPaused(false);
      setLoadingAudioId(null);

      audio.onended = () => {
        if (sessionId !== playbackSessionRef.current) {
          return;
        }
        setSpeakingMessageId(null);
        setIsPaused(false);
        clearAudio();
      };

      audio.onerror = () => {
        if (sessionId !== playbackSessionRef.current) {
          return;
        }
        console.error("Audio error");
        setSpeakingMessageId(null);
        setIsPaused(false);
        clearAudio();
      }

      const audioBlob = await response.blob();
      if (sessionId !== playbackSessionRef.current) {
        return;
      }
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      audio.src = audioUrl;
      audio.load();
      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      clearAudio();
      setSpeakingMessageId(null);
      setLoadingAudioId(null);
      setIsPaused(false);
    }
  };

  const stopVoice = () => {
    clearAudio();
    setSpeakingMessageId(null);
    setLoadingAudioId(null);
    setIsPaused(false);
  };

  useEffect(() => {
    const normalizedThreadId = queryThreadId || null;

    if (lastSyncedThreadIdRef.current === normalizedThreadId) {
      return;
    }

    lastSyncedThreadIdRef.current = normalizedThreadId;

    const loadConversation = async () => {
      if (!normalizedThreadId) {
        setThreadId(undefined);
        setMessages([]);
        setInput("");
        speechSynthesis.cancel();
        return;
      }

      try {
        const res = await fetch(
          `/api/get-chat?threadId=${encodeURIComponent(normalizedThreadId)}`
        );
        if (!res.ok) throw new Error("Failed to load chat");

        const data = await res.json();

        if (Array.isArray(data.messages)) {
          const normalizedMessages = data.messages.map(
            (msg: { role: string; content?: string }, index: number) => ({
              ...msg,
              id: `db-${index}-${Date.now()}`,
            })
          );

          setThreadId(normalizedThreadId);
          setMessages(normalizedMessages);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
      }
    };

    loadConversation();
  }, [queryThreadId, setInput, setMessages, setThreadId]);

  useEffect(() => {
    triggerScrollToBottom();
  }, [messages, triggerScrollToBottom]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  useEffect(() => {
    const possible = messages.filter(
      (message) =>
        message.role === "data" &&
        (message as AssistantDataMessageClient).data.type === "message.text"
    );

    if (possible.length > 0) {
      setPossibleQuestionsMessage(
        (possible[possible.length - 1] as AssistantDataMessageClient).data.value
      );
    }
  }, [messages]);

  const saveConversation = debounce((filtered) => {
    fetch("/api/store-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        username,
        fullname,
        threadId: queryThreadId || threadId,
        messages: filtered,
      }),
    })
      .then((res) => res.json())
      .then(console.log)
      .catch(console.error);
  }, 1000);

  useEffect(() => {
    const filtered = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role,
        content: message.content || (message as any)?.data?.value || "",
      }))
      .filter((message) => message.content.length > 0);

    const last = messages[messages.length - 1];
    const hasAI = filtered.some((message) => message.role === "assistant");
    const endsWithAI = last?.role === "assistant";

    if (filtered.length > 0 && hasAI && endsWithAI && threadId) {
      saveConversation(filtered);
    }
  }, [messages, saveConversation, threadId]);

  useEffect(() => {
    return () => {
      saveConversation.cancel();
      clearAudio();
    };
  }, [saveConversation]);

  useEffect(() => {
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
    }

    clearAudio();

    setSpeakingMessageId(null);
    setLoadingAudioId(null);
  }, [queryThreadId]);

  const resetConversation = () => {
    setThreadId(undefined);
    setMessages([]);
    setQuestionSelected(false);
    setSelectedFiles([]);
    setPossibleQuestionsMessage(undefined);
    speechSynthesis.cancel();
    setSidebarOpen(false);
  };

  const handleVoiceTranscript = (text: string) => {
    setInput((prev) => (prev.trim() ? `${prev} ${text}` : text));
  };

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleSubmitWithFiles = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input.trim() && selectedFiles.length === 0) return;

    if (selectedFiles.length > 0) {
      const formData = new FormData();
      formData.append("message", input);
      if (threadId) formData.append("threadId", threadId);
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const messageFiles = selectedFiles.map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
      }));

      const uploadedFilenames = messageFiles.map((file) => file.name).join(", ");
      const fileNote = `Uploaded: ${uploadedFilenames}`;
      const content =
        input.trim().length > 0 ? `${input.trim()}\n${fileNote}` : fileNote;

      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content,
        createdAt: new Date(),
        files: messageFiles,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setSelectedFiles([]);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantResponse = "";
        let buffer = "";
        const assistantMessageId = (Date.now() + 1).toString();

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            createdAt: new Date(),
          },
        ]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;

              if (line.startsWith("0:")) {
                const textContent = line.slice(2);
                if (textContent.startsWith('"')) {
                  const text = JSON.parse(textContent);
                  assistantResponse += text;
                  setMessages((prev) =>
                    prev.map((message) =>
                      message.id === assistantMessageId
                        ? { ...message, content: assistantResponse }
                        : message
                    )
                  );
                }
              } else if (line.startsWith("6:")) {
                try {
                  const data = JSON.parse(line.slice(2));
                  if (
                    data.role === "data" &&
                    data.data?.type === "message.text"
                  ) {
                    assistantResponse = data.data.value;
                    setMessages((prev) =>
                      prev.map((message) =>
                        message.id === assistantMessageId
                          ? { ...message, content: assistantResponse }
                          : message
                      )
                    );
                  }
                } catch (parseError) {
                  console.log("Parse error", parseError);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    } else {
      submitMessage(event);
    }
  };

  const handleSidebarItemClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const unlockIOSAudio = () => {
    const isIOSDevice = () => {
      if (typeof window === "undefined") return false;

      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isiOS = /iPad|iPhone|iPod/.test(ua);
      const isTouchMac = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;

      return (isiOS || isTouchMac) && !window.MSStream;
    };

    if (isIOSDevice()) {
      try {
        const audio = new Audio();
        audio.src =
          "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA";
        audio
          .play()
          .then(() => {
            audio.pause();
            window.__iosUnlockedAudio__ = audio;
          })
          .catch((error) => {
            console.warn("Play failed during unlock:", error);
          });
      } catch (error) {
        console.warn("iOS audio unlock failed:", error);
      }
    }
  };

  const openVoiceAssistant = () => {
    unlockIOSAudio();

    const url = `/voice-assistant?email=${encodeURIComponent(
      email
    )}&username=${encodeURIComponent(username)}&fullname=${encodeURIComponent(
      fullname
    )}`;
    const width = window.screen.width;
    const height = window.screen.height;

    const popup = window.open(
      url,
      "_blank",
      `width=${width},height=${height},top=0,left=0,toolbar=0,menubar=0,scrollbars=0,resizable=1`
    );

    if (!popup) {
      alert("Please allow popups in your browser.");
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-16 top-14 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-200/25 blur-3xl" />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative flex h-full gap-4 px-3 pb-3 pt-16 md:px-4 md:py-4 lg:px-6 lg:py-6">
        <div className="fixed left-3 right-3 top-3 z-50 flex items-center justify-between md:hidden">
          <Button
            onClick={() => setSidebarOpen((prev) => !prev)}
            variant="ghost"
            size="icon"
            className="glass-panel h-11 w-11 rounded-2xl border border-white/70 text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.12)]"
          >
            <Menu size={20} />
          </Button>

          <div className="glass-panel rounded-full border border-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-800 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            Surgery Abroad
          </div>

          <TooltipButton text="Start a fresh conversation">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetConversation}
              className="glass-panel h-11 w-11 rounded-2xl border border-white/70 text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.12)]"
            >
              <RotateCcw size={18} />
            </Button>
          </TooltipButton>
        </div>

        <div
          className={`fixed inset-y-3 left-3 z-40 w-[86vw] max-w-xs transition-transform duration-300 md:static md:w-[320px] md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-[112%]"
          }`}
        >
          <Sidebar onItemClick={handleSidebarItemClick} className="h-full max-w-none" />
        </div>

        <Card className="glass-panel relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
          <CardHeader className="border-b border-white/70 bg-white/40 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-end">
              <div className="flex flex-wrap items-center gap-2">
                {["24/7 availability", "Instant replies", "File-aware support"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                    >
                      {item}
                    </span>
                  )
                )}

                <TooltipButton text="Start a fresh conversation">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={resetConversation}
                    className="hidden h-11 w-11 rounded-2xl border border-white/70 bg-white/75 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:bg-white md:inline-flex"
                  >
                    <RotateCcw size={18} />
                  </Button>
                </TooltipButton>
              </div>
            </div>
          </CardHeader>

          <CardContent
            ref={divRef}
            className={`flex-1 px-4 pb-6 pt-6 sm:px-6 lg:px-8 ${
              messages.length === 0
                ? "overflow-hidden"
                : "custom-scrollbar overflow-y-auto"
            }`}
          >
            <div
              className={`mx-auto flex w-full max-w-4xl flex-col gap-6 ${
                messages.length === 0 ? "h-full justify-start pt-2" : ""
              }`}
            >
              {messages.length === 0 && (
                <InitialQuestions onQuestionClick={handleQuestionClick} />
              )}

              {messages.map((message) =>
                message.role === "assistant" ? (
                  <div key={message.id} className="flex flex-col gap-2">
                    <Message message={message} />
                    <div className="ml-14 flex">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                        {speakingMessageId !== message.id && (
                          <button
                            type="button"
                            title="Play voice"
                            onClick={() =>
                              playRealisticVoice(message.content || "", message.id)
                            }
                            disabled={loadingAudioId === message.id}
                            className="flex items-center gap-1 transition hover:text-sky-700"
                          >
                            {loadingAudioId === message.id ? (
                              <Loader className="h-4 w-4 animate-spin text-slate-400" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                            <span className="font-medium">Listen</span>
                          </button>
                        )}

                        {speakingMessageId === message.id && !loadingAudioId && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleVoicePlayback(message.id)}
                              className="rounded-full p-1 transition hover:bg-sky-50"
                            >
                              {isPaused ? (
                                <Play className="h-4 w-4 text-sky-600" />
                              ) : (
                                <Pause className="h-4 w-4 text-rose-600" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={stopVoice}
                              className="rounded-full p-1 transition hover:bg-amber-50"
                            >
                              <Square className="h-4 w-4 text-amber-600" />
                            </button>

                            {!isPaused && (
                              <span className="ml-1 flex items-end gap-[2px]">
                                <span className="dot dot1" />
                                <span className="dot dot2" />
                                <span className="dot dot3" />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : message.role !== "data" ? (
                  <Message key={message.id} message={message} />
                ) : null
              )}
            </div>
          </CardContent>

          <CardFooter className="border-t border-white/70 bg-white/45 p-3 sm:p-4 lg:px-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
              {possibleQuestionsMessage && (
                <PossibleQuestions
                  messageText={possibleQuestionsMessage}
                  onQuestionClick={handleQuestionClick}
                />
              )}

              {selectedFiles.length > 0 && (
                <div className="w-full rounded-[26px] border border-white/70 bg-white/72 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Attachments ready
                      </p>
                      <p className="text-xs text-slate-500">
                        Review files before sending
                      </p>
                    </div>
                    {selectedFiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-xs font-medium text-rose-500 transition hover:text-rose-700"
                        disabled={!isAwaitingMessage}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="flex w-24 flex-col items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50/80 p-2 text-center">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white">
                            {file.type.startsWith("image/") ? (
                              <Image
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                              />
                            ) : file.type === "application/pdf" ? (
                              <div className="text-xs font-semibold text-rose-500">
                                PDF
                              </div>
                            ) : (
                              <div className="text-xs font-semibold text-slate-500">
                                File
                              </div>
                            )}
                          </div>
                          <div className="max-w-full truncate text-[11px] text-slate-600">
                            {file.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
                          }
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                          disabled={!isAwaitingMessage}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form
                ref={formRef}
                onSubmit={handleSubmitWithFiles}
                className="relative rounded-[30px] border border-white/70 bg-white/82 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.1)] backdrop-blur-xl"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1 rounded-[24px] bg-slate-950/[0.03] px-1 py-1">
                    <TextareaAutosize
                      placeholder="Ask me about clinics, procedures, recovery, or medical tourism..."
                      className="min-h-[56px] w-full resize-none rounded-[20px] bg-transparent px-4 py-3 text-sm text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400"
                      minRows={1}
                      maxRows={6}
                      autoFocus
                      tabIndex={0}
                      value={input}
                      onKeyDown={onKeyDown}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 px-1 pb-1 lg:justify-end">
                    <div className="flex items-center gap-2">
                      <FileUpload
                        files={selectedFiles}
                        onFilesChange={handleFilesChange}
                        disabled={!isAwaitingMessage}
                        maxFiles={3}
                      />

                      <VoiceInput
                        onAppendText={handleVoiceTranscript}
                        disabled={!isAwaitingMessage}
                        panelVariant="inline"
                      />

                      <TooltipButton text="Open live voice assistant">
                        <button
                          type="button"
                          onClick={openVoiceAssistant}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/70 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white"
                        >
                          <div className="flex items-end gap-[3px]">
                            <div className="h-[8px] w-[3px] rounded-full bg-slate-700" />
                            <div className="h-[14px] w-[3px] rounded-full bg-slate-900" />
                            <div className="h-[10px] w-[3px] rounded-full bg-slate-700" />
                          </div>
                        </button>
                      </TooltipButton>
                    </div>

                    <TooltipButton
                      text={
                        isAwaitingMessage
                          ? "Send message"
                          : "Assistant is replying"
                      }
                    >
                      <Button
                        type="submit"
                        size="icon"
                        className="h-12 w-12 rounded-2xl bg-sky-600 text-white shadow-[0_16px_35px_rgba(2,132,199,0.32)] transition duration-200 hover:-translate-y-0.5 hover:bg-sky-700"
                        disabled={
                          !isAwaitingMessage ||
                          (input.trim().length === 0 && selectedFiles.length === 0)
                        }
                      >
                        {isAwaitingMessage ? (
                          <ArrowRight className="h-5 w-5" />
                        ) : (
                          <Loader className="h-5 w-5 animate-spin" />
                        )}
                      </Button>
                    </TooltipButton>
                  </div>
                </div>

              </form>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
