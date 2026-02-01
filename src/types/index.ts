// Language Types
export type Language = 'de' | 'en' | 'bg';

export interface LanguageConfig {
  code: Language;
  name: string;
  flag: string;
  speechCode: string;
}

// User & Team Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
  avatar?: string;
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: Date;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  color: string;
}

// Recording State
export type RecordingState = 'idle' | 'recording' | 'processing';

// Enrichment Modes
export type EnrichmentMode = 
  | 'smart-notes'
  | 'email-draft'
  | 'meeting-notes'
  | 'code-comment'
  | 'task-list'
  | 'creative';

export interface ModeConfig {
  id: EnrichmentMode;
  name: string;
  icon: string;
  color: string;
}

// Speaker Diarization
export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface TranscriptSegment {
  speakerId: string;
  text: string;
  startTime: number;
  endTime: number;
}

// Timestamped transcript segment with optional translation
export interface TimestampedSegment {
  timestamp: number;  // Recording time in seconds
  text: string;       // Original transcribed text
  translation?: string;  // Translated text (if auto-translate was enabled)
}

// Translation info for saved notes
export interface TranslationInfo {
  targetLanguage: 'en' | 'de' | 'bg';
  segments: TimestampedSegment[];
}

// Comments & Collaboration
export interface Comment {
  id: string;
  noteId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

// Audit Log
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'share' | 'export' | 'login' | 'logout';
  target: string;
  details?: string;
  timestamp: Date;
}

// Note Types - Extended
export interface Note {
  id: string;
  title: string;
  rawTranscript: string;
  summary: string;
  mode: EnrichmentMode;
  sentiment: 'positive' | 'neutral' | 'negative';
  language: Language;
  deadline?: string;
  createdAt: Date;
  updatedAt: Date;
  duration?: number;
  // New fields
  speakers?: Speaker[];
  segments?: TranscriptSegment[];
  comments?: Comment[];
  sharedWith?: string[];
  isImportant?: boolean;
  tags?: string[];
  // Timestamped transcript with translations
  timestampedSegments?: TimestampedSegment[];
  translationLanguage?: 'en' | 'de' | 'bg';  // Target language if auto-translate was used
}

// Analytics Types
export interface AnalyticsData {
  totalNotes: number;
  totalDuration: number;
  notesThisWeek: number;
  notesThisMonth: number;
  averageDuration: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  modeBreakdown: Record<EnrichmentMode, number>;
  dailyActivity: { date: string; count: number }[];
  topTags: { tag: string; count: number }[];
}

// Voice Command Types
export interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
}

// Store Types
export interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  team: Team | null;
  
  // Recording
  recordingState: RecordingState;
  currentMode: EnrichmentMode;
  currentLanguage: Language;
  
  // Notes
  notes: Note[];
  selectedNoteId: string | null;
  
  // UI
  sidebarCollapsed: boolean;
  isEditingTranscript: boolean;
  editingNoteId: string | null;
  voiceCommandsEnabled: boolean;
  offlineMode: boolean;
  
  // Audit
  auditLog: AuditLogEntry[];
  
  // Actions
  login: (email: string, password: string) => boolean;
  register: (email: string, password: string, name: string) => boolean;
  logout: () => void;
  setRecordingState: (state: RecordingState) => void;
  setCurrentMode: (mode: EnrichmentMode) => void;
  setCurrentLanguage: (lang: Language) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  toggleSidebar: () => void;
  setEditingTranscript: (editing: boolean, noteId?: string | null) => void;
  toggleVoiceCommands: () => void;
  toggleOfflineMode: () => void;
  addComment: (noteId: string, text: string) => void;
  toggleImportant: (noteId: string) => void;
  addAuditLog: (action: AuditLogEntry['action'], target: string, details?: string) => void;
  shareNote: (noteId: string, email: string) => void;
  deleteTeamMember: (email: string) => boolean;
  updateMemberRole: (email: string, newRole: 'admin' | 'manager' | 'member') => boolean;
  getTeamMembers: () => { email: string; name: string; role: string }[];
}

// Date Filter
export interface DateFilter {
  year: number | null;
  month: number | null;
  day: number | null;
}

// Language configurations
export const LANGUAGES: LanguageConfig[] = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'en', name: 'English', flag: '🇬🇧', speechCode: 'en-US' },
  { code: 'bg', name: 'Български', flag: '🇧🇬', speechCode: 'bg-BG' },
];

// Mode configurations
export const MODES: Record<EnrichmentMode, ModeConfig> = {
  'smart-notes': { id: 'smart-notes', name: 'Smart Notes', icon: '📝', color: 'purple' },
  'email-draft': { id: 'email-draft', name: 'Email Draft', icon: '✉️', color: 'blue' },
  'meeting-notes': { id: 'meeting-notes', name: 'Meeting Notes', icon: '📋', color: 'green' },
  'code-comment': { id: 'code-comment', name: 'Code Comment', icon: '💻', color: 'cyan' },
  'task-list': { id: 'task-list', name: 'Task List', icon: '✅', color: 'orange' },
  'creative': { id: 'creative', name: 'Creative', icon: '✨', color: 'pink' },
};

// Speaker colors for diarization
export const SPEAKER_COLORS = [
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];
