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

  const handleSpeak = (language: 'original' | 'english' | 'bulgarian' = 'original') => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      let textToSpeak: string;
      let lang: string;

      if (language === 'english' && translatedText) {
        // Speak translated English version
        textToSpeak = translatedSummary || translatedText;
        lang = 'en-US';
      } else if (language === 'bulgarian' && translatedBgText) {
        // Speak translated Bulgarian version
        textToSpeak = translatedBgSummary || translatedBgText;
        lang = 'bg-BG';
      } else {
        // Speak original language
        textToSpeak = note.summary || note.rawTranscript;
        lang = note.language === 'de' ? 'de-DE' : note.language === 'bg' ? 'bg-BG' : 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang;
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleTranslate = async () => {
    if (translatedText) {
      // Toggle translation view
      setShowTranslation(!showTranslation);
      setShowBgTranslation(false);
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
    } catch (error) {
      console.error('Bulgarian translation error:', error);
      alert('Превод неуспешен. Моля, опитайте по-късно.');
    } finally {
      setIsTranslatingBg(false);
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

        {/* Action Buttons Row */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Vorlesen Original */}
          <button
            onClick={() => handleSpeak('original')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-colors"
          >
            {isSpeaking && !showTranslation && !showBgTranslation ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            Vorlesen
          </button>

          {/* Translate to English Button */}
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              showTranslation
                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
            } disabled:opacity-50`}
          >
            {isTranslating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
            {isTranslating ? 'Übersetze...' : showTranslation ? '🇬🇧 English ✓' : '🇬🇧 English'}
          </button>

          {/* Translate to Bulgarian Button */}
          <button
            onClick={handleTranslateBulgarian}
            disabled={isTranslatingBg}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              showBgTranslation
                ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
            } disabled:opacity-50`}
          >
            {isTranslatingBg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
            {isTranslatingBg ? 'Превеждам...' : showBgTranslation ? '🇧🇬 Български ✓' : '🇧🇬 Български'}
          </button>

          {/* Speak English (only when translated) */}
          {translatedText && (
            <button
              onClick={() => handleSpeak('english')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-300 text-sm hover:bg-green-500/30 transition-colors"
            >
              {isSpeaking && showTranslation ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              🇬🇧 Speak English
            </button>
          )}

          {/* Speak Bulgarian (only when translated) */}
          {translatedBgText && (
            <button
              onClick={() => handleSpeak('bulgarian')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 text-sm hover:bg-orange-500/30 transition-colors"
            >
              {isSpeaking && showBgTranslation ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              🇧🇬 Говори
            </button>
          )}
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
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">🇬🇧 English</span>
                )}
                {showBgTranslation && translatedBgText && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">🇧🇬 Български</span>
                )}
              </h4>
              <div className="flex items-center gap-2">
                {(showTranslation || showBgTranslation) && (
                  <button
                    onClick={() => { setShowTranslation(false); setShowBgTranslation(false); }}
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
                  : 'Zusammenfassung'}
              {showTranslation && translatedSummary && (
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">🇬🇧</span>
              )}
              {showBgTranslation && translatedBgSummary && (
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">🇧🇬</span>
              )}
            </h4>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {showTranslation && translatedSummary
              ? translatedSummary
              : showBgTranslation && translatedBgSummary
                ? translatedBgSummary
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
