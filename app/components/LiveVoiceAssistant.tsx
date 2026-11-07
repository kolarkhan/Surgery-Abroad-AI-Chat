

"use client";


declare global {
  interface Window {
    MSStream?: any;
  }
}
declare global {
  interface Window {
    __iosUnlockedAudio__?: HTMLAudioElement;
  }
}


import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { v4 as uuidv4 } from "uuid";

export default function LiveVoiceAssistant({ onClose }: { onClose: () => void }) {
  const [micOn, setMicOn] = useState(false);
  const micOnRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("guest@example.com");
  const [userName, setUserName] = useState("guest");
  const [fullName, setFullName] = useState("Guest User");
  const [autostart, setAutostart] = useState(true);
  const [lastAssistantText, setLastAssistantText] = useState<string | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);




  const shouldSpeakRef = useRef(true);
  const isLockedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ttsAbortRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);


  const stopAssistant = () => {
    ttsAbortRef.current = true;
    setMicOn(false);
    micOnRef.current = false;
    shouldSpeakRef.current = false;
    stopListening();
    stopSpeaking();
    setIsSpeaking(false);
    setIsFetching(false);
    setIsProcessing(false);
    isLockedRef.current = false;
    localStorage.removeItem("voice_threadId");
    setThreadId(null);
    onClose();
  };

  const initUserInfo = () => {
    const params = new URLSearchParams(window.location.search);
    setUserEmail(params.get("email") || "guest@example.com");
    setUserName(params.get("username") || "guest");
    setFullName(params.get("fullname") || "Guest User");
    const newThread = uuidv4();
    localStorage.setItem("voice_threadId", newThread);
    setThreadId(newThread);
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

const stopSpeaking = () => {
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }
  if (audioUrlRef.current) {
    URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }
  window.speechSynthesis.cancel();
  setIsSpeaking(false);
};


  const toggleMic = async () => {
    const newState = !micOn;
    micOnRef.current = newState;
    shouldSpeakRef.current = newState;

    if (!newState) {
      ttsAbortRef.current = true;
      stopListening();
      stopSpeaking();
      resetFlags();
    } else {
      ttsAbortRef.current = false;
      startListening();
    }

    setMicOn(newState);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      let silenceCounter = 0;
      let hasSpoken = false;

      const idleTimeout = setTimeout(() => {
        if (!hasSpoken && recorder.state === "recording") {
          recorder.stop();
        }
      }, 10000);

      const checkVolume = () => {
        analyser.getByteTimeDomainData(data);
        const avgVolume = data.reduce((sum, val) => sum + Math.abs(val - 128), 0) / data.length;

        if (avgVolume > 8) {
          hasSpoken = true;
          silenceCounter = 0;
        } else if (hasSpoken) {
          silenceCounter++;
        }

        // End capture sooner after the user stops talking to reduce reply latency.
        if (hasSpoken && silenceCounter > 36) {
          if (recorder.state === "recording") recorder.stop();
          return;
        }

        if (recorder.state === "recording") {
          requestAnimationFrame(checkVolume);
        }
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        clearTimeout(idleTimeout);
        audioCtx.close();

        if (!micOnRef.current || !shouldSpeakRef.current) {
          resetFlags();
          return;
        }

        if (!hasSpoken) {
          console.log("No voice detected. Discarding and restarting...");
          resetFlags();
          if (micOnRef.current && shouldSpeakRef.current) {
            startListening();
          }
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        handleTranscription(audioBlob);
      };

      recorder.start();
      checkVolume();
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    if (!threadId || isLockedRef.current) {
      resetFlags();
      return;
    }

    isLockedRef.current = true;
    setIsFetching(true);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", blob, "speech.webm");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data?.text && data.text.trim()) {
        await handleVoiceMessage(data.text);
      } else {
        resetFlags();
      }
    } catch (err) {
      console.error("Transcription error:", err);
      resetFlags();
    }
  };

  const handleVoiceMessage = async (message: string) => {
    try {
      const res = await fetch(
        `/api/voice-assistant?email=${userEmail}&username=${userName}&fullname=${fullName}&threadId=${threadId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );

      const data = await res.json();

      if (data?.text && micOnRef.current && shouldSpeakRef.current) {
        // await streamTTS(data.text);
        if (isIOS()) {
    setLastAssistantText(data.text); // Wait for tap
  } else {
    await streamTTS(data.text); // Auto-play
  }
      } else {
        resetFlags();
      }
    } catch (err) {
      console.error("Assistant error:", err);
      resetFlags();
    }
  };


const isIOS = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return iOSDevice && !window.MSStream;
};

// const isIOS = () => {
//   if (typeof window === "undefined") return false;

//   const ua = window.navigator.userAgent;

//   const isIOS = /iP(hone|od|ad)/.test(ua);
//   const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);

//   return isIOS && isSafari;
// };




const streamTTS = async (text: string) => {
  if (!ttsAbortRef.current) ttsAbortRef.current = false;
  if (ttsAbortRef.current) return;

  stopSpeaking();
  setIsSpeaking(true);

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/wav",
      },
      body: JSON.stringify({
        text,
        voice: "Kore",
      }),
    });

    if (!response.ok) throw new Error("TTS request failed");

    if (!micOnRef.current || !shouldSpeakRef.current || ttsAbortRef.current) return;

    const shouldUseMediaSource =
      !isIOS() &&
      typeof window !== "undefined" &&
      "MediaSource" in window &&
      !!response.body &&
      MediaSource.isTypeSupported("audio/wav");
    const mediaSourceFallback = shouldUseMediaSource ? response.clone() : null;

    const audio = isIOS() && window.__iosUnlockedAudio__ ? window.__iosUnlockedAudio__ : new Audio();
    audioRef.current = audio;

    audio.onended = () => {
      if (!ttsAbortRef.current) {
        resetFlags();
        if (micOnRef.current) startListening();
      }
      stopSpeaking();
    };

    audio.onerror = () => {
      console.error("Audio playback error");
      resetFlags();
      stopSpeaking();
    };

    if (shouldUseMediaSource) {
      const mediaSource = new MediaSource();
      const mediaUrl = URL.createObjectURL(mediaSource);
      const reader = response.body!.getReader();

      audioUrlRef.current = mediaUrl;
      audio.src = mediaUrl;
      audio.load();

      mediaSource.addEventListener(
        "sourceopen",
        async () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer("audio/wav");
            let started = false;

            const pump = async () => {
              const { value, done } = await reader.read();

              if (done || ttsAbortRef.current) {
                if (mediaSource.readyState === "open") {
                  mediaSource.endOfStream();
                }
                return;
              }

              sourceBuffer.appendBuffer(value);
              sourceBuffer.addEventListener(
                "updateend",
                () => {
                  if (!started && micOnRef.current && shouldSpeakRef.current) {
                    started = true;
                    audio.play().catch((error) => {
                      console.warn("MediaSource audio play failed:", error);
                    });
                  }
                  void pump();
                },
                { once: true }
              );
            };

            void pump();
          } catch (error) {
            console.warn("MediaSource playback failed, falling back to blob:", error);
            if (!mediaSourceFallback) {
              stopSpeaking();
              resetFlags();
              return;
            }

            const blob = await mediaSourceFallback.blob();
            const fallbackUrl = URL.createObjectURL(blob);
            audioUrlRef.current = fallbackUrl;
            audio.src = fallbackUrl;
            audio.load();
            await audio.play();
          }
        },
        { once: true }
      );

      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    audio.src = url;
    audio.load();
    await audio.play();
  } catch (err) {
    console.error("TTS error:", err);
    resetFlags();
    stopSpeaking();
  }
};














  const resetFlags = () => {
    setIsSpeaking(false);
    setIsFetching(false);
    setIsProcessing(false);
    isLockedRef.current = false;
  };

  



useEffect(() => {
  initUserInfo();

  const urlAutostart = new URLSearchParams(window.location.search).get("autostart");
  const shouldAutoStart = urlAutostart === "true" || urlAutostart === null; // default true
  setAutostart(shouldAutoStart);

  return () => stopListening();
}, []);

// Auto mic-on if autostart is enabled and threadId is ready
useEffect(() => {
  if (autostart && threadId && !micOn) {
    console.log("🎬 Auto-starting mic and listening...");

    const autoStart = async () => {
      micOnRef.current = true;
      shouldSpeakRef.current = true;
      setMicOn(true);
      await startListening();
    };

    const delay = setTimeout(() => {
      autoStart();
    }, 400); // delay helps prevent race conditions

    return () => clearTimeout(delay);
  }
}, [autostart, threadId]);







const unlockIOSAudio = () => {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);

  if (iOS && !window.__iosUnlockedAudio__) {
    try {
      const audio = new Audio();
      audio.src = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA";
      audio.play().then(() => {
        audio.pause();
        window.__iosUnlockedAudio__ = audio;
        console.log("✅ iOS audio unlocked");
      }).catch((e) => {
        console.warn("🔒 iOS audio unlock failed:", e);
      });
    } catch (e) {
      console.warn("🔒 iOS audio unlock exception:", e);
    }
  }
};




useEffect(() => {
  const handler = () => {
    unlockIOSAudio();
    window.removeEventListener("click", handler);
  };

  if (isIOS()) {
    window.addEventListener("click", handler, { once: true });
  }

  return () => {
    window.removeEventListener("click", handler);
  };
}, []);



const handleSpeakClick = async () => {
  if (lastAssistantText) {
    await streamTTS(lastAssistantText);
    setLastAssistantText(null); // Reset after speaking
  }
};

useEffect(() => {
  setIsIOSDevice(isIOS());
}, []);



return (
  <Suspense fallback={<div>Loading...</div>}>
    <div className="fixed inset-0 z-50 bg-black w-full h-full flex flex-col items-center justify-center text-white">
      <Image
        src="/avatar.png"
        alt="Assistant Avatar"
        width={160}
        height={160}
        className={`rounded-full mb-8 transition-all ${isSpeaking ? "ring-4 ring-green-400 animate-pulse" : ""}`}
      />

      {isFetching && !isSpeaking && (
        <div className="flex items-center justify-center mb-6 space-x-3 h-8">
          {[16, 12, 8].map((size, i) => (
            <div
              key={i}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: "9999px",
                background: `linear-gradient(135deg, #3b82f6, #60a5fa)`,
                animation: `pulseWave 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                display: "inline-block",
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      )}

      {isIOSDevice && lastAssistantText && !isSpeaking && (
  <button
    onClick={handleSpeakClick}
    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-xl transition-all"
  >
    🔊 Listen
  </button>
)}

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full transition-all ${
            micOn ? "bg-gray-600 text-white ring-2 animate-pulse" : "bg-red-700 text-white"
          }`}
        >
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button onClick={stopAssistant} className="bg-gray-700 p-4 rounded-full text-white">
          <X size={24} />
        </button>
      </div>
    </div>
  </Suspense>
);

}




