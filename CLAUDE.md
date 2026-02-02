# CLAUDE.md - AI Assistant Guide for Voice-Agent (VelaMind)

## Project Overview

**VelaMind** is a modern web-based voice-to-text application built for team meetings and productivity. It transforms spoken conversations into structured, AI-enriched notes with features like real-time transcription, multi-language support, analytics, and team collaboration.

**Repository Structure:**
```
/home/user/Voice-Agent/
├── CLAUDE.md              # This file - AI assistant guide
├── README.md              # Basic project description
└── velamind (12).zip      # Source code archive containing:
    └── voicemind/
        ├── src/
        │   ├── app/           # Next.js App Router pages & API routes
        │   ├── components/    # React UI components
        │   ├── hooks/         # Custom React hooks
        │   ├── lib/           # State management (Zustand store)
        │   └── types/         # TypeScript type definitions
        ├── public/            # Static assets & PWA manifest
        ├── package.json       # Dependencies & npm scripts
        └── [config files]     # TS, Tailwind, PostCSS configs
```

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.3 | Full-stack React framework (App Router) |
| React | 18.3.1 | UI component library |
| TypeScript | 5.4.5 | Static typing |
| Zustand | 4.5.2 | Lightweight state management |
| TailwindCSS | 3.4.3 | Utility-first CSS styling |
| Framer Motion | 11.2.6 | Animations |
| Web Speech API | Native | Browser speech-to-text |
| OpenAI GPT | 3.5-turbo/4 | Optional AI summarization |

## Development Commands

```bash
# Navigate to source directory (after extraction)
cd voicemind

# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

## Key Files & Their Purposes

### Configuration Files
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript config with `@/` path alias for src/
- `tailwind.config.ts` - TailwindCSS theme configuration
- `.env.example` - Environment variables template (OPENAI_API_KEY, OPENAI_MODEL)

### Core Application Files

| File | Size | Purpose |
|------|------|---------|
| `src/lib/store.ts` | 10KB | Zustand state management with localStorage persistence |
| `src/types/index.ts` | 5.5KB | TypeScript interfaces for all data types |
| `src/app/api/summarize/route.ts` | 4.4KB | OpenAI API endpoint for AI summarization |
| `src/app/page.tsx` | 0.8KB | Main entry point - routes to Auth or Dashboard |
| `src/app/globals.css` | 2.9KB | CSS variables, animations, global styles |

### React Components (`src/components/`)

| Component | Size | Purpose |
|-----------|------|---------|
| `Sidebar.tsx` | 35KB | Navigation, mode selection, date filtering |
| `NoteCard.tsx` | 20KB | Individual note display, editing, sharing |
| `SettingsPanel.tsx` | 12KB | User settings and preferences |
| `TeamPanel.tsx` | 10KB | Team management and collaboration |
| `Dashboard.tsx` | 9KB | Main application container |
| `AudioRecorder.tsx` | 9KB | Recording controls and transcript handling |
| `AnalyticsDashboard.tsx` | 9KB | Statistics, charts, productivity metrics |
| `NotesList.tsx` | 3.7KB | List view with filtering |
| `AuthScreen.tsx` | 3.7KB | Login/Register interface |
| `LanguageSelector.tsx` | 2.3KB | Language switcher (DE/EN/BG) |

### Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useSpeechRecognition.ts` | Web Speech API wrapper with ref-based state management |
| `useVoiceCommands.ts` | Voice command listener (start/stop/mark/help) |

## Architecture & Patterns

### State Management
- **Zustand store** (`src/lib/store.ts`) handles all global state
- **Persistence middleware** saves state to localStorage
- **Key state slices**: auth, recording, notes, UI, filters, audit logs

### Component Patterns
- All components are **functional with hooks**
- **'use client'** directive for client-side components
- **Props typed** with explicit TypeScript interfaces
- **Custom events** for cross-component communication

### Speech Recognition Pattern
```typescript
// Uses refs for synchronous transcript access (avoids stale closure issues)
const finalTranscriptRef = useRef<string>('');
const interimTranscriptRef = useRef<string>('');
```

### API Pattern (Summarization)
```typescript
// POST /api/summarize
// Accepts: { text: string, language: 'de'|'en'|'bg', mode: string }
// Returns: { title, summary, sentiment } or falls back to local generation
```

## Key Features & Modes

### 6 Enrichment Modes
1. **Smart Notes** (purple) - General note-taking
2. **Email Draft** (blue) - Professional email composition
3. **Meeting Notes** (green) - Structured meeting documentation
4. **Code Comment** (cyan) - Code explanation & documentation
5. **Task List** (orange) - Action items and TODOs
6. **Creative** (pink) - Brainstorming & creative content

### Voice Commands (German/English)
| Command | Action |
|---------|--------|
| "start" / "aufnahme" | Begin recording |
| "stop" / "stopp" / "beenden" | Stop recording |
| "wichtig" / "markier" | Mark as important |
| "hilfe" / "help" | Show help |

### Keyboard Shortcuts
- `Ctrl+Shift+V` - Start/stop recording
- `Escape` - Cancel recording

## Code Conventions

### Import Aliases
```typescript
import { Component } from '@/components';  // Maps to src/components
import { useStore } from '@/lib/store';    // Maps to src/lib/store
```

### Type Definitions
All types centralized in `src/types/index.ts`:
- `User`, `Team`, `TeamMember` - Authentication & team management
- `Note`, `Comment`, `TranscriptSegment` - Note data structures
- `EnrichmentMode`, `Language`, `RecordingState` - Union types
- `AnalyticsData`, `DateFilter` - Analytics interfaces

### CSS Conventions
- **Dark theme** by default (CSS variables in globals.css)
- **Tailwind utilities** for component styling
- **Custom classes** for animations: `.pulse-ring`, `.recording-glow`
- **Badge classes**: `.badge-positive`, `.badge-neutral`, `.badge-negative`

### Error Handling
- Speech API errors handled gracefully with user feedback
- API errors fall back to local summarization
- Try-catch around JSON parsing with fallback to raw text

## Environment Variables

```env
# Required for AI summarization (optional - app works without)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4, gpt-4-turbo
```

Without an API key, the app uses local rule-based summarization.

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | Recommended | Full Web Speech API support |
| Edge | Works | Chromium-based |
| Firefox | Limited | Partial Speech API |
| Safari | Not supported | No Web Speech API |

## Special Accounts

- **Admin account**: `VelaMind@velamind.de` (always gets admin role)
- **First registered user** automatically becomes admin

## Data Storage

- **LocalStorage only** - No backend database
- **Zustand persistence** - Automatic state serialization
- **User data key**: `velamind-users`

## Common Tasks for AI Assistants

### When modifying components:
1. Check imports use `@/` alias
2. Ensure 'use client' directive for interactive components
3. Update types in `src/types/index.ts` if adding new data structures
4. Test in Chrome for full speech functionality

### When working with state:
1. Modify `src/lib/store.ts` for new state slices
2. Add persistence handling if needed
3. Export actions for state mutations

### When adding features:
1. Consider multi-language support (DE/EN/BG)
2. Add audit logging for user actions
3. Support both admin and member roles
4. Maintain offline compatibility

## Testing

No test framework currently configured. When adding tests:
- Consider Jest + React Testing Library
- Mock Web Speech API for speech-related tests
- Mock localStorage for state persistence tests

## PWA Support

The app is installable as a Progressive Web App:
- Manifest at `public/manifest.json`
- Theme color: `#8b5cf6` (purple)
- Display mode: standalone

## Git Workflow

Current branch: `claude/claude-md-ml5j8avnb91ntn2i-KsGp8`

When making changes:
1. Extract zip if needed: `unzip "velamind (12).zip"`
2. Make changes in `voicemind/` directory
3. Test with `npm run dev`
4. Commit with descriptive messages
5. Push to the current feature branch
