# VelaMind - Voice Intelligence Platform

## Project Overview

VelaMind is a voice-to-text meeting notes application built with Next.js/React and TypeScript. It supports both free browser-based speech recognition (Web Speech API) and paid OpenAI Whisper API for higher accuracy transcription.

## Key Technologies

- **Frontend**: Next.js 14, React 18, TypeScript
- **State Management**: Zustand with persistence
- **Speech Recognition**:
  - Web Speech API (free, real-time, browser-based)
  - OpenAI Whisper API (paid, post-recording, higher accuracy)
- **Translation**: MyMemory API (free)
- **AI Summarization**: OpenAI GPT-4o-mini / GPT-4
- **Styling**: TailwindCSS

## Project Structure

```
/src
├── /app
│   ├── /api
│   │   ├── whisper/route.ts    # OpenAI Whisper integration
│   │   ├── transcribe/route.ts # Legacy transcription endpoint
│   │   └── summarize/route.ts  # AI summarization
│   ├── layout.tsx
│   └── page.tsx
├── /components
│   ├── AudioRecorder.tsx       # Main recording component (KEY FILE)
│   ├── useSpeechRecognition.ts # Web Speech API hook
│   ├── useVoiceCommands.ts     # Voice command detection
│   ├── NoteCard.tsx            # Note display with translations
│   ├── NotesList.tsx           # Notes list view
│   ├── SettingsPanel.tsx       # Settings configuration
│   └── Dashboard.tsx           # Main dashboard
├── /hooks
│   ├── useSpeechRecognition.ts # Speech recognition logic
│   └── useVoiceCommands.ts     # Voice commands
├── /lib
│   ├── store.ts                # Zustand state management
│   ├── encryption.ts           # AES-256 encryption
│   └── sentimentAnalysis.ts    # Local sentiment detection
└── /types
    └── index.ts                # TypeScript definitions
```

## How Whisper AI Works

### Important: Understanding the Recording Flow

1. **Live Preview (During Recording)**:
   - Uses **Web Speech API** (browser's built-in speech recognition)
   - This is FREE but less accurate
   - Shows real-time text as you speak
   - Labeled as "Browser-Vorschau" when Whisper is enabled

2. **Final Processing (After Recording Stops)**:
   - If Whisper is enabled, audio blob is sent to OpenAI Whisper API
   - Whisper analyzes the COMPLETE audio file
   - Returns more accurate transcription with proper timestamps
   - This is the PAID service with better quality

3. **Why Both?**
   - Whisper CANNOT do real-time streaming (API limitation)
   - Web Speech API provides instant feedback during recording
   - Final result uses Whisper's superior transcription

## Environment Variables

Required in `.env.local`:

```env
OPENAI_API_KEY=sk-proj-xxx    # Required for Whisper and Summarization
```

Optional:
```env
OPENAI_MODEL=gpt-4o-mini      # Model for summarization
ANTHROPIC_API_KEY=xxx         # Alternative AI (Claude)
ELEVENLABS_API_KEY=xxx        # Voice cloning
```

## Key Files to Modify

### For Whisper Issues:
- `src/components/AudioRecorder.tsx` - Main recording logic
- `src/app/api/whisper/route.ts` - Whisper API endpoint

### For Speech Recognition Issues:
- `src/hooks/useSpeechRecognition.ts` - Web Speech API hook

### For Note Display Issues:
- `src/components/NoteCard.tsx` - Note display and translations

### For State/Settings:
- `src/lib/store.ts` - Zustand store

## Common Issues and Solutions

### 1. "Whisper transcription is bad"
**Cause**: User sees Web Speech API preview during recording, not Whisper.
**Solution**: Look at the final saved note - that uses Whisper. The live preview is just browser-based.

### 2. Translation not working with Whisper
**Cause**: Live translation is disabled when Whisper is active (segments will be re-transcribed).
**Solution**: Translations are applied AFTER Whisper processing, before saving.

### 3. Audio format issues
**Cause**: File extension mismatch with actual mimeType.
**Solution**: Code now detects mimeType and uses correct extension (webm, mp4, ogg, wav).

## Settings in the App

- **useWhisper**: Toggle Whisper AI (in Settings panel)
- **useSystemAudio**: Capture system audio for meetings
- **voiceCommandsEnabled**: Enable "VelaMind Stop/Pause" commands

## Running the App

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## Testing Whisper

1. Enable Whisper in Settings
2. Start recording
3. Speak clearly
4. Notice "Browser-Vorschau" label during recording
5. Stop recording
6. Wait for "Whisper AI analysiert Audio..."
7. Check the saved note - this uses Whisper's transcription

## API Costs

- **Web Speech API**: Free (browser)
- **Whisper API**: ~$0.006 per minute of audio
- **GPT-4o-mini**: ~$0.15 per 1M input tokens
- **MyMemory Translation**: Free (with limits)

## Future Improvements

- [ ] Add option to disable live preview when Whisper is active
- [ ] Show side-by-side comparison of Web Speech vs Whisper
- [ ] Add audio playback of recordings
- [ ] Implement real-time Whisper streaming (when available)
- [ ] Add speaker diarization
