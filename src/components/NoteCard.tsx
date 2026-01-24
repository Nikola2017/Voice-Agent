'use client';

import { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Note } from '@/types';
import { SPEAKER_COLORS } from '@/types';

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
  
  const isEditing = isEditingTranscript && editingNoteId === note.id;

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
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingLang(null);
      };
      speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setSpeakingLang(language);
    }
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
      // Translate transcript
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

      // Use MyMemory free translation API
      const translateText = async (text: string): Promise<string> => {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await response.json();
        if (data.responseStatus === 200) {
          return data.responseData.translatedText;
        }
        throw new Error('Translation failed');
      };

      // Translate both transcript and summary
      const [translated, translatedSum] = await Promise.all([
        translateText(note.rawTranscript),
        note.summary ? translateText(note.summary) : Promise.resolve('')
      ]);

      setTranslatedText(translated);
      setTranslatedSummary(translatedSum);
      setShowTranslation(true);
      setShowBgTranslation(false);
      setShowDeTranslation(false);
    } catch (error) {
      console.error('Translation error:', error);
      alert('Übersetzung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateBulgarian = async () => {
    if (translatedBgText) {
      // Toggle translation view
      setShowBgTranslation(!showBgTranslation);
      setShowTranslation(false);
      setShowDeTranslation(false);
      return;
    }

    setIsTranslatingBg(true);

    try {
      // Translate transcript
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

      // Use MyMemory free translation API
      const translateText = async (text: string): Promise<string> => {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await response.json();
        if (data.responseStatus === 200) {
          return data.responseData.translatedText;
        }
        throw new Error('Translation failed');
      };

      // Translate both transcript and summary
      const [translated, translatedSum] = await Promise.all([
        translateText(note.rawTranscript),
        note.summary ? translateText(note.summary) : Promise.resolve('')
      ]);

      setTranslatedBgText(translated);
      setTranslatedBgSummary(translatedSum);
      setShowBgTranslation(true);
      setShowTranslation(false);
      setShowDeTranslation(false);
    } catch (error) {
      console.error('Bulgarian translation error:', error);
      alert('Превод неуспешен. Моля, опитайте по-късно.');
    } finally {
      setIsTranslatingBg(false);
    }
  };

  const handleTranslateGerman = async () => {
    if (translatedDeText) {
      // Toggle translation view
      setShowDeTranslation(!showDeTranslation);
      setShowTranslation(false);
      setShowBgTranslation(false);
      return;
    }

    setIsTranslatingDe(true);

    try {
      // Translate transcript
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

      // Use MyMemory free translation API
      const translateText = async (text: string): Promise<string> => {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await response.json();
        if (data.responseStatus === 200) {
          return data.responseData.translatedText;
        }
        throw new Error('Translation failed');
      };

      // Translate both transcript and summary
      const [translated, translatedSum] = await Promise.all([
        translateText(note.rawTranscript),
        note.summary ? translateText(note.summary) : Promise.resolve('')
      ]);

      setTranslatedDeText(translated);
      setTranslatedDeSummary(translatedSum);
      setShowDeTranslation(true);
      setShowTranslation(false);
      setShowBgTranslation(false);
    } catch (error) {
      console.error('German translation error:', error);
      alert('Übersetzung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
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
              
              <span className={`px-2 py-0.5 rounded-full text-xs badge-${note.sentiment}`}>
                {note.sentiment}
              </span>
              
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

        {/* Language Tools Section */}
        <div className="mt-4 p-3 rounded-lg bg-[#1a1325]/50 border border-purple-500/10">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sprache & Vorlesen</span>
          </div>

          {/* Language Table */}
          <div className="space-y-2">
            {/* Original Language Row */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#241b2f]/50 hover:bg-[#241b2f] transition-colors">
              <span className="text-lg w-8 text-center">📝</span>
              <span className="flex-1 text-sm text-zinc-300 font-medium">Original</span>
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
            </div>

            {/* German Row */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#241b2f]/50 hover:bg-[#241b2f] transition-colors">
              <span className="text-lg w-8 text-center">🇩🇪</span>
              <span className="flex-1 text-sm text-zinc-300 font-medium">Deutsch</span>
              <button
                onClick={handleTranslateGerman}
                disabled={isTranslatingDe}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  showDeTranslation
                    ? 'bg-yellow-500/30 text-yellow-300'
                    : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                } disabled:opacity-50`}
              >
                {isTranslatingDe ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                {isTranslatingDe ? '...' : showDeTranslation ? 'Aktiv ✓' : 'Übersetzen'}
              </button>
              {translatedDeText && (
                <button
                  onClick={() => handleSpeak('german')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isSpeaking && speakingLang === 'german'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  }`}
                >
                  {isSpeaking && speakingLang === 'german' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  Vorlesen
                </button>
              )}
            </div>

            {/* English Row */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#241b2f]/50 hover:bg-[#241b2f] transition-colors">
              <span className="text-lg w-8 text-center">🇬🇧</span>
              <span className="flex-1 text-sm text-zinc-300 font-medium">English</span>
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  showTranslation
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                } disabled:opacity-50`}
              >
                {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                {isTranslating ? '...' : showTranslation ? 'Active ✓' : 'Translate'}
              </button>
              {translatedText && (
                <button
                  onClick={() => handleSpeak('english')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isSpeaking && speakingLang === 'english'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  }`}
                >
                  {isSpeaking && speakingLang === 'english' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  Speak
                </button>
              )}
            </div>

            {/* Bulgarian Row */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#241b2f]/50 hover:bg-[#241b2f] transition-colors">
              <span className="text-lg w-8 text-center">🇧🇬</span>
              <span className="flex-1 text-sm text-zinc-300 font-medium">Български</span>
              <button
                onClick={handleTranslateBulgarian}
                disabled={isTranslatingBg}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  showBgTranslation
                    ? 'bg-orange-500/30 text-orange-300'
                    : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                } disabled:opacity-50`}
              >
                {isTranslatingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                {isTranslatingBg ? '...' : showBgTranslation ? 'Активен ✓' : 'Превод'}
              </button>
              {translatedBgText && (
                <button
                  onClick={() => handleSpeak('bulgarian')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isSpeaking && speakingLang === 'bulgarian'
                      ? 'bg-orange-500 text-white'
                      : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                  }`}
                >
                  {isSpeaking && speakingLang === 'bulgarian' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  Говори
                </button>
              )}
            </div>
          </div>
        </div>
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
          <div className="flex items-center gap-2 mb-3">
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
          <p className="text-sm text-zinc-300 leading-relaxed">
            {showTranslation && translatedSummary
              ? translatedSummary
              : showBgTranslation && translatedBgSummary
                ? translatedBgSummary
                : showDeTranslation && translatedDeSummary
                  ? translatedDeSummary
                  : (note.summary || 'Keine Zusammenfassung verfügbar.')}
          </p>
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
