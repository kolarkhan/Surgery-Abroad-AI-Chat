# Surgery Abroad AI Chat

An AI chatbot website that guides prospective patients through surgery-abroad and medical-tourism options: procedures, destinations, costs, travel and recovery planning.

## Features
- Conversational medical-tourism assistant powered by Google Gemini
- Voice input with speech-to-text, plus text-to-speech replies and a live voice assistant mode
- Suggested starter and follow-up questions
- File attachments in chat
- Conversation history, summaries and an analytics summary endpoint, stored in MongoDB

## Tech stack
- Next.js 14 (App Router), React, TypeScript
- Tailwind CSS, shadcn/ui-style components
- Google Gemini API (chat, transcription, TTS)
- MongoDB

## Getting started
```bash
npm install
cp .env.example .env.local   # then add your own keys
npm run dev
```
Open http://localhost:3000.

> `.env.local` holds your API keys - never commit it.
