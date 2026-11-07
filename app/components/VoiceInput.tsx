"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { Check, Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import TooltipButton from "./TooltipButton";

interface VoiceInputProps {
  onAppendText: (text: string) => void;
  disabled?: boolean;
  panelVariant?: "fixed" | "inline";
}

export default function VoiceInput({
  onAppendText,
  disabled = false,
  panelVariant = "fixed",
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const waveformBars = [
    8, 10, 13, 18, 24, 31, 39, 48, 58, 68, 58, 48, 39, 31, 24, 18, 13, 10, 8,
  ];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContextRef.current = new AudioContext();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current.connect(analyserRef.current);

      detectSpeech();

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onerror = (event) => {
        const errorEvent = event as unknown as { error?: Error };
        console.error("Recorder error:", errorEvent.error);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();

      setIsRecording(true);
      setAudioBlob(null);
    } catch (err) {
      alert("Microphone permission is required.");
      console.error("Mic error:", err);
    }
  };

  const detectSpeech = () => {
    if (!analyserRef.current) return;

    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);

    const check = () => {
      analyserRef.current?.getByteFrequencyData(buffer);
      const volume = buffer.reduce((a, b) => a + b, 0) / buffer.length;
      setIsSpeaking(volume > 10);
      animationFrameRef.current = requestAnimationFrame(check);
    };

    check();
  };

  const stopAnalyzers = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }

    setIsSpeaking(false);
  };

  const stopRecordingAndGetBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) {
        reject("No recorder");
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        resolve(blob);
      };

      recorder.onerror = (event) => {
        const errorEvent = event as unknown as { error?: Error };
        reject(errorEvent.error);
      };

      recorder.stop();
      setIsRecording(false);
      stopAnalyzers();
    });
  };

  const handleTranscriptionSubmit = async () => {
    try {
      setIsTranscribing(true);

      let blobToSend: Blob | null = audioBlob;
      if (isRecording && mediaRecorderRef.current?.state !== "inactive") {
        blobToSend = await stopRecordingAndGetBlob();
        setAudioBlob(blobToSend);
      }

      if (!blobToSend || blobToSend.size === 0) {
        alert("No audio recorded or audio is empty.");
        return;
      }

      const formData = new FormData();
      formData.append("file", blobToSend, "audio.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Transcription API error:", errText);
        alert("Transcription failed");
        return;
      }

      const data = await res.json();
      if (data?.text) {
        onAppendText(data.text);
      } else {
        alert("No transcription received");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Error transcribing audio");
    } finally {
      setIsTranscribing(false);
      setIsRecording(false);
      stopAnalyzers();
    }
  };

  const handleCancel = () => {
    if (
      isRecording &&
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setAudioBlob(null);
    setIsRecording(false);
    setIsTranscribing(false);
    stopAnalyzers();
  };

  return (
    <div>
      <TooltipButton text={isRecording ? "Stop recording" : "Start voice input"}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={clsx(
            "h-11 w-11 rounded-2xl border border-white/70 bg-white/70 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white",
            isRecording ? "animate-pulse border-red-200 text-red-500" : "text-slate-700"
          )}
          onClick={isRecording ? handleCancel : startRecording}
          disabled={disabled || isTranscribing}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </Button>
      </TooltipButton>

      {(isRecording || isTranscribing) && (
        <div
          className={clsx(
            "flex items-center justify-between rounded-[28px] border px-4 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl",
            panelVariant === "fixed"
              ? "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border-white/70 bg-white/92"
              : "absolute inset-2 z-20 border-slate-200 bg-white"
          )}
        >
          <button
            onClick={handleCancel}
            disabled={isTranscribing}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>

          <div className="mx-4 flex flex-1 items-center justify-center">
            <div className="w-full max-w-[700px] rounded-full bg-white px-4 py-2">
              <div className="flex h-[34px] items-center justify-center gap-[3px]">
                {waveformBars.map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className={clsx(
                      "block w-[3px] rounded-full origin-center transition-all duration-200",
                      isTranscribing
                        ? "bg-slate-300"
                        : isSpeaking
                          ? "animate-voice-bar bg-[#6b6b6b]"
                          : "bg-[#6b6b6b]"
                    )}
                    style={{
                      height: `${height}px`,
                      animationDelay: `${index * 0.035}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleTranscriptionSubmit}
            disabled={isTranscribing}
            className={clsx(
              "flex h-11 w-11 items-center justify-center rounded-full transition-all",
              isTranscribing
                ? "cursor-not-allowed bg-slate-400"
                : "bg-sky-600 text-white hover:bg-sky-700"
            )}
          >
            {isTranscribing ? (
              <svg
                className="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : (
              <Check size={20} />
            )}
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes voice-bar {
          0% {
            transform: scaleY(0.72);
            opacity: 0.88;
          }
          35% {
            transform: scaleY(1.08);
            opacity: 1;
          }
          65% {
            transform: scaleY(0.84);
            opacity: 0.94;
          }
          100% {
            transform: scaleY(0.72);
            opacity: 0.88;
          }
        }

        .animate-voice-bar {
          animation: voice-bar 0.85s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
