'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Edit3,
  Copy,
  Trash2,
  Play,
  Check,
  X,
  Save,
  Calendar,
  Pause,
  Star,
  Share2,
  MessageSquare,
  Send,
  Users,
  ChevronDown,
  Minimize2,
  Languages,
  Loader2,
  User,
  Volume2,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Note } from '@/types';
import { SPEAKER_COLORS } from '@/types';
import { analyzeSentiment, getSentimentEmoji, type SentimentResult } from '@/lib/sentimentAnalysis';

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const { 
    updateNote, 
    deleteNote, 
    isEditingTranscript, 
    editingNoteId, 
    setEditingTranscript,
    toggleImportant,
    addComment,
    shareNote,
    user,
  } = useAppStore();
  
  const [copied, setCopied] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(note.rawTranscript);
  const [editedTitle, setEditedTitle] = useState(note.title);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState(note.deadline || '');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDateEditor, setShowDateEditor] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isMinimized, setIsMinimized] = useState(true);
  // Translation states - English
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  // Translation states - Bulgarian
  const [translatedBgText, setTranslatedBgText] = useState<string | null>(null);
  const [translatedBgSummary, setTranslatedBgSummary] = useState<string | null>(null);
  const [isTranslatingBg, setIsTranslatingBg] = useState(false);
  const [showBgTranslation, setShowBgTranslation] = useState(false);
  // Translation states - German
  const [translatedDeText, setTranslatedDeText] = useState<string | null>(null);
  const [translatedDeSummary, setTranslatedDeSummary] = useState<string | null>(null);
  const [isTranslatingDe, setIsTranslatingDe] = useState(false);
  const [showDeTranslation, setShowDeTranslation] = useState(false);
  // Current speaking language
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  // Voice selection - store actual voice name
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  // Summary editing
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState(note.summary || '');
  // Language tools collapse
  const [showLanguageTools, setShowLanguageTools] = useState(false);
  // Sentiment analysis
  const [showSentimentDetails, setShowSentimentDetails] = useState(false);

  const isEditing = isEditingTranscript && editingNoteId === note.id;

  // Local sentiment analysis
  const localSentiment = useMemo(() => {
    return analyzeSentiment(note.rawTranscript, note.language);
  }, [note.rawTranscript, note.language]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      // Set default voice if not set
      if (!selectedVoiceName && voices.length > 0) {
        const defaultVoice = voices.find(v => v.default) || voices[0];
        setSelectedVoiceName(defaultVoice.name);
      }
    };

    // Load voices immediately and also on change
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoiceName]);

  // Group voices by language for display
  const groupedVoices = useMemo(() => {
    const groups: { [key: string]: SpeechSynthesisVoice[] } = {
      'de': [],
      'en': [],
      'bg': [],
      'other': []
    };

    availableVoices.forEach(voice => {
      const lang = voice.lang.split('-')[0].toLowerCase();
      if (groups[lang]) {
        groups[lang].push(voice);
      } else {
        groups['other'].push(voice);
      }
    });

    return groups;
  }, [availableVoices]);

  // Get the selected voice object
  const getSelectedVoice = (): SpeechSynthesisVoice | null => {
    return availableVoices.find(v => v.name === selectedVoiceName) || null;
  };

  // Detect if voice is likely female based on name
  const isFemalVoice = (name: string): boolean => {
    const femalePatterns = ['female', 'woman', 'frau', 'zira', 'helena', 'sabina', 'iveta', 'anna', 'linda', 'susan', 'karen', 'victoria', 'samantha', 'sara', 'marie', 'julia', 'emma', 'sophia', 'lisa', 'eva', 'nina', 'kate', 'alice'];
    return femalePatterns.some(p => name.toLowerCase().includes(p));
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Ungültiges Datum';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
  };

  const formatDateShort = (date: Date | string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const parseDate = (dateStr: string): Date | null => {
    const parts = dateStr.split(/[.\-/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const formatDeadline = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-./]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2) {
        return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
      }
      return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
    }
    return dateStr;
  };

  const handleDateEdit = () => {
    setEditedDate(formatDateShort(note.createdAt));
    setShowDateEditor(true);
  };

  const handleDateSave = () => {
    const newDate = parseDate(editedDate);
    if (newDate) {
      const oldDate = new Date(note.createdAt);
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
      updateNote(note.id, { createdAt: newDate });
    }
    setShowDateEditor(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(note.rawTranscript + '\n\n' + note.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (confirm('Notiz wirklich löschen?')) {
      deleteNote(note.id);
    }
  };

  const handleStartEdit = () => {
    setEditedTranscript(note.rawTranscript);
    setEditedTitle(note.title);
    setEditingTranscript(true, note.id);
  };

  const handleSaveEdit = () => {
    updateNote(note.id, { 
      rawTranscript: editedTranscript,
      title: editedTitle 
    });
    setEditingTranscript(false, null);
  };

  const handleCancelEdit = () => {
    setEditedTranscript(note.rawTranscript);
    setEditedTitle(note.title);
    setEditingTranscript(false, null);
  };

  const handleSpeak = (language: 'original' | 'english' | 'bulgarian' | 'german' = 'original') => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingLang(null);
    } else {
      let textToSpeak: string;
      let lang: string;

      if (language === 'english' && translatedText) {
        // Speak translated English transcription
        textToSpeak = translatedText;
        lang = 'en-US';
      } else if (language === 'bulgarian' && translatedBgText) {
        // Speak translated Bulgarian transcription
        textToSpeak = translatedBgText;
        lang = 'bg-BG';
      } else if (language === 'german' && translatedDeText) {
        // Speak translated German transcription
        textToSpeak = translatedDeText;
        lang = 'de-DE';
      } else {
        // Speak original transcription
        textToSpeak = note.rawTranscript;
        lang = note.language === 'de' ? 'de-DE' : note.language === 'bg' ? 'bg-BG' : 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang;

      // Apply selected voice directly
      const voice = getSelectedVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingLang(null);
      };
      speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setSpeakingLang(language);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    const content = `
${note.title}
${'='.repeat(note.title.length)}

Datum: ${formatDate(note.createdAt)}
Stimmung: ${note.sentiment}

TRANSKRIPTION:
${note.rawTranscript}

ZUSAMMENFASSUNG:
${note.summary || 'Keine Zusammenfassung verfügbar.'}
    `.trim();

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveSummary = () => {
    updateNote(note.id, { summary: editedSummary });
    setIsEditingSummary(false);
  };

  const handleCancelSummaryEdit = () => {
    setEditedSummary(note.summary || '');
    setIsEditingSummary(false);
  };

  // Helper function to translate text in chunks (MyMemory limit is ~500 chars)
  const translateInChunks = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
    const CHUNK_SIZE = 400; // Safe limit for MyMemory API

    // If text is small enough, translate directly
    if (text.length <= CHUNK_SIZE) {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
      );
      const data = await response.json();
      if (data.responseStatus === 200) {
        return data.responseData.translatedText;
      }
      throw new Error('Translation failed');
    }

    // Split text into sentences or chunks
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= CHUNK_SIZE) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        // If single sentence is too long, split by words
        if (sentence.length > CHUNK_SIZE) {
          const words = sentence.split(' ');
          currentChunk = '';
          for (const word of words) {
            if ((currentChunk + ' ' + word).length <= CHUNK_SIZE) {
              currentChunk += (currentChunk ? ' ' : '') + word;
            } else {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = word;
            }
          }
        } else {
          currentChunk = sentence;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    // Translate each chunk with delay to avoid rate limiting
    const translatedChunks: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (i > 0) await new Promise(r => setTimeout(r, 300)); // Small delay between requests

      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${sourceLang}|${targetLang}`
      );
      const data = await response.json();
      if (data.responseStatus === 200) {
        translatedChunks.push(data.responseData.translatedText);
      } else {
        throw new Error(`Translation failed for chunk ${i + 1}`);
      }
    }

    return translatedChunks.join(' ');
  };

  const handleTranslate = async () => {
    if (translatedText) {
      // Toggle translation view
      setShowTranslation(!showTranslation);
      setShowBgTranslation(false);
      setShowDeTranslation(false);
      return;
    }

    setIsTranslating(true);

    try {
      const sourceLang = note.language === 'de' ? 'de' : note.language === 'bg' ? 'bg' : 'en';
      const targetLang = 'en';

      if (sourceLang === targetLang) {
        setTranslatedText(note.rawTranscript);
        setTranslatedSummary(note.summary);
        setShowTranslation(true);
        setShowBgTranslation(false);
        setShowDeTranslation(false);
        setIsTranslating(false);
        return;
      }

      // Translate using chunked method
      const [translated, translatedSum] = await Promise.all([
        translateInChunks(note.rawTranscript, sourceLang, targetLang),
        note.summary ? translateInChunks(note.summary, sourceLang, targetLang) : Promise.resolve('')
      ]);

      setTranslatedText(translated);
      setTranslatedSummary(translatedSum);
      setShowTranslation(true);
      setShowBgTranslation(false);
      setShowDeTranslation(false);
    } catch (error) {
      console.error('Translation error:', error);
      alert('Übersetzung fehlgeschlagen. Text zu lang oder API-Limit erreicht.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateBulgarian = async () => {
    if (translatedBgText) {
      setShowBgTranslation(!showBgTranslation);
      setShowTranslation(false);
      setShowDeTranslation(false);
      return;
    }

    setIsTranslatingBg(true);

    try {
      const sourceLang = note.language === 'de' ? 'de' : note.language === 'en' ? 'en' : 'bg';
      const targetLang = 'bg';

      if (sourceLang === targetLang) {
        setTranslatedBgText(note.rawTranscript);
        setTranslatedBgSummary(note.summary);
        setShowBgTranslation(true);
        setShowTranslation(false);
        setShowDeTranslation(false);
        setIsTranslatingBg(false);
        return;
      }

      const [translated, translatedSum] = await Promise.all([
        translateInChunks(note.rawTranscript, sourceLang, targetLang),
        note.summary ? translateInChunks(note.summary, sourceLang, targetLang) : Promise.resolve('')
      ]);

      setTranslatedBgText(translated);
      setTranslatedBgSummary(translatedSum);
      setShowBgTranslation(true);
      setShowTranslation(false);
      setShowDeTranslation(false);
    } catch (error) {
      console.error('Bulgarian translation error:', error);
      alert('Превод неуспешен. Текстът е твърде дълъг.');
    } finally {
      setIsTranslatingBg(false);
    }
  };

  const handleTranslateGerman = async () => {
    if (translatedDeText) {
      setShowDeTranslation(!showDeTranslation);
      setShowTranslation(false);
      setShowBgTranslation(false);
      return;
    }

    setIsTranslatingDe(true);

    try {
      const sourceLang = note.language === 'en' ? 'en' : note.language === 'bg' ? 'bg' : 'de';
      const targetLang = 'de';

      if (sourceLang === targetLang) {
        setTranslatedDeText(note.rawTranscript);
        setTranslatedDeSummary(note.summary);
        setShowDeTranslation(true);
        setShowTranslation(false);
        setShowBgTranslation(false);
        setIsTranslatingDe(false);
        return;
      }

      const [translated, translatedSum] = await Promise.all([
        translateInChunks(note.rawTranscript, sourceLang, targetLang),
        note.summary ? translateInChunks(note.summary, sourceLang, targetLang) : Promise.resolve('')
      ]);

      setTranslatedDeText(translated);
      setTranslatedDeSummary(translatedSum);
      setShowDeTranslation(true);
      setShowTranslation(false);
      setShowBgTranslation(false);
    } catch (error) {
      console.error('German translation error:', error);
      alert('Übersetzung fehlgeschlagen. Text zu lang.');
    } finally {
      setIsTranslatingDe(false);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment(note.id, newComment.trim());
      setNewComment('');
    }
  };

  const handleShare = () => {
    if (shareEmail.trim()) {
      shareNote(note.id, shareEmail.trim());
      setShareEmail('');
      setShowShareModal(false);
    }
  };

  return (
    <article className={`bg-[#0f0a15] rounded-xl border ${note.isImportant ? 'border-yellow-500/30' : 'border-purple-500/10'}`}>
      {/* Header */}
      <div className="p-4 border-b border-purple-500/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-lg font-semibold bg-transparent border-b border-purple-500/30 focus:border-purple-500 outline-none"
              />
            ) : (
              <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                {note.isImportant && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                {note.title}
              </h3>
            )}
            
            {/* Meta Info Row */}
            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 flex-wrap">
              {showDateEditor ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    placeholder="TT.MM.JJJJ"
                    className="w-24 px-2 py-0.5 text-xs rounded bg-[#241b2f] border border-purple-500/30 text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDateSave();
                      if (e.key === 'Escape') setShowDateEditor(false);
                    }}
                  />
                  <button onClick={handleDateSave} className="p-0.5 rounded hover:bg-green-500/20 text-green-400">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setShowDateEditor(false)} className="p-0.5 rounded hover:bg-red-500/20 text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleDateEdit}
                  className="hover:text-purple-400 hover:underline cursor-pointer transition-colors"
                  title="Klicken zum Bearbeiten"
                >
                  {formatDate(note.createdAt)}
                </button>
              )}
              
              <button
                onClick={() => setShowSentimentDetails(!showSentimentDetails)}
                className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors hover:opacity-80 ${
                  localSentiment.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                  localSentiment.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                  'bg-zinc-500/20 text-zinc-400'
                }`}
                title="Sentiment-Analyse anzeigen"
              >
                {localSentiment.sentiment === 'positive' ? <TrendingUp className="w-3 h-3" /> :
                 localSentiment.sentiment === 'negative' ? <TrendingDown className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {getSentimentEmoji(localSentiment.sentiment)}
                <span className="hidden sm:inline">
                  {localSentiment.sentiment === 'positive' ? 'Positiv' :
                   localSentiment.sentiment === 'negative' ? 'Negativ' : 'Neutral'}
                </span>
              </button>
              
              {note.deadline && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                  <Calendar className="w-3 h-3" />
                  {formatDeadline(note.deadline)}
                </span>
              )}

              {note.sharedWith && note.sharedWith.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                  <Users className="w-3 h-3" />
                  {note.sharedWith.length} geteilt
                </span>
              )}

              {note.comments && note.comments.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                  <MessageSquare className="w-3 h-3" />
                  {note.comments.length}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${
                isMinimized ? 'text-purple-400' : 'text-zinc-400 hover:text-white'
              }`}
              title={isMinimized ? "Ausklappen" : "Minimieren"}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? '-rotate-90' : ''}`} />
            </button>
            <button
              onClick={() => toggleImportant(note.id)}
              className={`p-2 rounded-lg hover:bg-yellow-500/10 transition-colors ${
                note.isImportant ? 'text-yellow-400' : 'text-zinc-400 hover:text-yellow-400'
              }`}
              title="Als wichtig markieren"
            >
              <Star className={`w-4 h-4 ${note.isImportant ? 'fill-yellow-400' : ''}`} />
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              title="Teilen"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              title="Kommentare"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartEdit}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              title="Bearbeiten"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              title="Kopieren"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowDeadlinePicker(!showDeadlinePicker)}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              title="Deadline"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="mt-3 p-3 rounded-lg bg-[#1a1325] border border-purple-500/20">
            <p className="text-xs text-zinc-500 mb-2">Mit Teammitglied teilen:</p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="email@beispiel.de"
                className="flex-1 px-3 py-2 rounded-lg bg-[#241b2f] border border-purple-500/20 text-sm text-white placeholder-zinc-600"
              />
              <button
                onClick={handleShare}
                className="px-3 py-2 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-400"
              >
                Teilen
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm hover:bg-zinc-600"
              >
                Abbrechen
              </button>
            </div>
            {note.sharedWith && note.sharedWith.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {note.sharedWith.map((email, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                    {email}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sentiment Details */}
        {showSentimentDetails && (
          <div className="mt-3 p-3 rounded-lg bg-[#1a1325] border border-purple-500/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Sentiment-Analyse
              </p>
              <button
                onClick={() => setShowSentimentDetails(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span>Negativ</span>
                <span>Neutral</span>
                <span>Positiv</span>
              </div>
              <div className="h-2 bg-gradient-to-r from-red-500 via-zinc-500 to-green-500 rounded-full relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-purple-500 shadow"
                  style={{ left: `${((localSentiment.score + 1) / 2) * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
              <p className="text-center text-xs text-zinc-400 mt-1">
                Score: {(localSentiment.score * 100).toFixed(0)}% | Konfidenz: {localSentiment.confidence}%
              </p>
            </div>

            {/* Word Analysis */}
            <div className="grid grid-cols-2 gap-2">
              {localSentiment.details.positiveWords.length > 0 && (
                <div className="p-2 bg-green-500/10 rounded">
                  <p className="text-xs text-green-400 font-medium mb-1">Positive Wörter ({localSentiment.details.positiveCount})</p>
                  <div className="flex flex-wrap gap-1">
                    {localSentiment.details.positiveWords.slice(0, 5).map((word, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-green-500/20 rounded text-[10px] text-green-300">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {localSentiment.details.negativeWords.length > 0 && (
                <div className="p-2 bg-red-500/10 rounded">
                  <p className="text-xs text-red-400 font-medium mb-1">Negative Wörter ({localSentiment.details.negativeCount})</p>
                  <div className="flex flex-wrap gap-1">
                    {localSentiment.details.negativeWords.slice(0, 5).map((word, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-red-500/20 rounded text-[10px] text-red-300">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {localSentiment.details.positiveWords.length === 0 && localSentiment.details.negativeWords.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-2">
                Keine ausgeprägten Sentiment-Wörter gefunden - Text ist neutral.
              </p>
            )}
          </div>
        )}

        {/* Deadline Picker */}
        {showDeadlinePicker && (
          <div className="mt-3 p-3 rounded-lg bg-[#1a1325] border border-purple-500/20">
            <p className="text-xs text-zinc-500 mb-2">Deadline (z.B. 15.03.2026):</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                placeholder="TT.MM.JJJJ"
                className="flex-1 px-3 py-2 rounded-lg bg-[#241b2f] border border-purple-500/20 text-sm text-white placeholder-zinc-600"
              />
              <button
                onClick={() => {
                  if (deadlineInput.trim()) updateNote(note.id, { deadline: deadlineInput.trim() });
                  setShowDeadlinePicker(false);
                }}
                className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30"
              >
                Setzen
              </button>
              <button
                onClick={() => {
                  updateNote(note.id, { deadline: undefined });
                  setDeadlineInput('');
                  setShowDeadlinePicker(false);
                }}
                className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
              >
                Löschen
              </button>
            </div>
          </div>
        )}

        {/* Compact Language Tools */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {/* Vorlesen Original */}
          <button
            onClick={() => handleSpeak('original')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isSpeaking && speakingLang === 'original'
                ? 'bg-purple-500 text-white'
                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
            }`}
          >
            {isSpeaking && speakingLang === 'original' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            Vorlesen
          </button>

          {/* Voice Selector - Compact */}
          <div className="relative">
            <button
              onClick={() => setShowVoiceSelector(!showVoiceSelector)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#241b2f] border border-purple-500/20 text-xs text-zinc-400 hover:border-purple-500/40 transition-colors"
              title="Stimme wählen"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isFemalVoice(selectedVoiceName) ? '👩' : '👨'}</span>
            </button>

            {showVoiceSelector && (
              <div className="absolute left-0 top-full mt-1 z-20 w-64 max-h-60 overflow-y-auto p-2 rounded-lg bg-[#1a1325] border border-purple-500/20 shadow-xl">
                <p className="text-xs text-zinc-500 mb-2 px-2">Stimme wählen:</p>
                {[...groupedVoices['de'], ...groupedVoices['en'], ...groupedVoices['bg']].slice(0, 10).map((voice) => (
                  <button
                    key={voice.name}
                    onClick={() => {
                      setSelectedVoiceName(voice.name);
                      setShowVoiceSelector(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      selectedVoiceName === voice.name
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-zinc-400 hover:bg-[#241b2f] hover:text-white'
                    }`}
                  >
                    <span>{isFemalVoice(voice.name) ? '👩' : '👨'}</span>
                    <span className="flex-1 text-left truncate">{voice.name}</span>
                    {selectedVoiceName === voice.name && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language Toggle Button */}
          <button
            onClick={() => setShowLanguageTools(!showLanguageTools)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
              showLanguageTools
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-zinc-700/50 text-zinc-400 hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <ChevronDown className={`w-3 h-3 transition-transform ${showLanguageTools ? 'rotate-180' : ''}`} />
          </button>

          {/* Export */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-zinc-700/50 text-xs text-zinc-400 hover:text-white transition-colors"
            title="Export"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expanded Language Tools */}
        {showLanguageTools && (
          <div className="mt-2 p-2 rounded-lg bg-[#1a1325]/50 border border-purple-500/10 grid grid-cols-4 gap-2">
            {/* German */}
            <button
              onClick={handleTranslateGerman}
              disabled={isTranslatingDe}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                showDeTranslation ? 'bg-yellow-500/30 text-yellow-300' : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              } disabled:opacity-50`}
            >
              {isTranslatingDe ? <Loader2 className="w-3 h-3 animate-spin" /> : '🇩🇪'}
              <span className="hidden sm:inline">{showDeTranslation ? '✓' : 'DE'}</span>
            </button>
            {translatedDeText && (
              <button
                onClick={() => handleSpeak('german')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
                  isSpeaking && speakingLang === 'german' ? 'bg-yellow-500 text-white' : 'bg-yellow-500/20 text-yellow-300'
                }`}
              >
                {isSpeaking && speakingLang === 'german' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            )}

            {/* English */}
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                showTranslation ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
              } disabled:opacity-50`}
            >
              {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : '🇬🇧'}
              <span className="hidden sm:inline">{showTranslation ? '✓' : 'EN'}</span>
            </button>
            {translatedText && (
              <button
                onClick={() => handleSpeak('english')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
                  isSpeaking && speakingLang === 'english' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {isSpeaking && speakingLang === 'english' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            )}

            {/* Bulgarian */}
            <button
              onClick={handleTranslateBulgarian}
              disabled={isTranslatingBg}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                showBgTranslation ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
              } disabled:opacity-50`}
            >
              {isTranslatingBg ? <Loader2 className="w-3 h-3 animate-spin" /> : '🇧🇬'}
              <span className="hidden sm:inline">{showBgTranslation ? '✓' : 'BG'}</span>
            </button>
            {translatedBgText && (
              <button
                onClick={() => handleSpeak('bulgarian')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
                  isSpeaking && speakingLang === 'bulgarian' ? 'bg-orange-500 text-white' : 'bg-orange-500/20 text-orange-300'
                }`}
              >
                {isSpeaking && speakingLang === 'bulgarian' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content - nur anzeigen wenn nicht minimiert */}
      {!isMinimized && (
        <div className="p-4">
          {/* Speaker Labels (wenn vorhanden) */}
          {note.speakers && note.speakers.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500">Sprecher:</span>
              {note.speakers.map((speaker, i) => (
                <span 
                  key={speaker.id}
                  className="px-2 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: speaker.color || SPEAKER_COLORS[i % SPEAKER_COLORS.length] }}
                >
                  {speaker.name}
                </span>
              ))}
            </div>
          )}

          {/* Transcript */}
          {isEditing ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-zinc-400">Transkription bearbeiten</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30"
                  >
                    <Save className="w-3 h-3" />
                    Speichern
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                  >
                    <X className="w-3 h-3" />
                    Abbrechen
                  </button>
                </div>
              </div>
              <textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                className="w-full h-32 p-3 rounded-lg bg-[#1a1325] border border-purple-500/20 text-white text-sm resize-none focus:outline-none focus:border-purple-500/50"
              />
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                Transkription
                {showTranslation && translatedText && (
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">🇬🇧 English</span>
                )}
                {showBgTranslation && translatedBgText && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">🇧🇬 Български</span>
                )}
                {showDeTranslation && translatedDeText && (
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">🇩🇪 Deutsch</span>
                )}
              </h4>
              <div className="flex items-center gap-2">
                {(showTranslation || showBgTranslation || showDeTranslation) && (
                  <button
                    onClick={() => { setShowTranslation(false); setShowBgTranslation(false); setShowDeTranslation(false); }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Original anzeigen
                  </button>
                )}
                <button
                  onClick={handleStartEdit}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Bearbeiten
                </button>
              </div>
            </div>
            <p className="text-sm text-zinc-300 bg-[#1a1325] p-3 rounded-lg border border-purple-500/10">
              {showTranslation && translatedText
                ? translatedText
                : showBgTranslation && translatedBgText
                  ? translatedBgText
                  : showDeTranslation && translatedDeText
                    ? translatedDeText
                    : note.rawTranscript}
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 rounded-lg bg-[#1a1325] border border-purple-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                {showTranslation && translatedSummary
                  ? 'Summary'
                  : showBgTranslation && translatedBgSummary
                    ? 'Резюме'
                    : showDeTranslation && translatedDeSummary
                      ? 'Zusammenfassung'
                      : 'Zusammenfassung'}
                {showTranslation && translatedSummary && (
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">🇬🇧</span>
                )}
                {showBgTranslation && translatedBgSummary && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">🇧🇬</span>
                )}
                {showDeTranslation && translatedDeSummary && (
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">🇩🇪</span>
                )}
              </h4>
            </div>
            {!isEditingSummary && !(showTranslation || showBgTranslation || showDeTranslation) && (
              <button
                onClick={() => {
                  setEditedSummary(note.summary || '');
                  setIsEditingSummary(true);
                }}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Bearbeiten
              </button>
            )}
          </div>

          {isEditingSummary ? (
            <div>
              <textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="w-full h-24 p-3 rounded-lg bg-[#241b2f] border border-purple-500/20 text-white text-sm resize-none focus:outline-none focus:border-purple-500/50"
                placeholder="Zusammenfassung eingeben..."
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleSaveSummary}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30"
                >
                  <Save className="w-3 h-3" />
                  Speichern
                </button>
                <button
                  onClick={handleCancelSummaryEdit}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                >
                  <X className="w-3 h-3" />
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {showTranslation && translatedSummary
                ? translatedSummary
                : showBgTranslation && translatedBgSummary
                  ? translatedBgSummary
                  : showDeTranslation && translatedDeSummary
                    ? translatedDeSummary
                    : (note.summary || 'Keine Zusammenfassung verfügbar.')}
            </div>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 p-4 rounded-lg bg-[#1a1325] border border-purple-500/10">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Kommentare ({note.comments?.length || 0})
            </h4>

            {/* Existing Comments */}
            <div className="space-y-3 mb-4">
              {note.comments && note.comments.length > 0 ? (
                note.comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-[#241b2f] rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{comment.userName}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(comment.createdAt).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{comment.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 text-center py-2">Noch keine Kommentare</p>
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Kommentar schreiben..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#241b2f] border border-purple-500/20 text-sm text-white placeholder-zinc-600"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                className="px-3 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-400"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </article>
  );
}
