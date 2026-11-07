// app/voice-assistant/page.tsx
"use client";
import LiveVoiceAssistant from "@/app/components/LiveVoiceAssistant";

export default function VoiceAssistantPage() {
  return (
    <LiveVoiceAssistant onClose={() => window.close()} />
  );
}
