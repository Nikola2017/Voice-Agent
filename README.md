# 🎙️ VelaMind 2026 - Voice Intelligence Platform

Die ultimative Voice-to-Text App für Team-Meetings mit KI-Zusammenfassungen, Analytics, Collaboration und mehr.

## 👑 Admin-Account

**Email:** `VelaMind@velamind.de`

Dieser Account hat automatisch Admin-Rechte und kann:
- Teammitglieder löschen
- Berechtigungen ändern (Admin/Manager/Mitglied)
- Alle Audit Logs einsehen

## ✨ Features

### 🎤 Kern-Features
- **Live-Transkription** - Web Speech API (kostenlos, kein API Key)
- **KI-Zusammenfassung** - OpenAI GPT Integration (optional)
- **Multi-Sprachen** - 🇩🇪 Deutsch, 🇬🇧 English, 🇧🇬 Български
- **6 Modi** - Smart Notes, Email, Meeting, Code, Tasks, Creative

### 🗣️ Voice Commands (NEU!)
Sage einfach einen Befehl (Wake Word "Vela" optional):
- **"wichtig"** - Markiert die aktuelle Notiz als wichtig
- **"start"** oder **"aufnahme"** - Startet Aufnahme
- **"stopp"** - Beendet Aufnahme
- **"hilfe"** - Liest verfügbare Befehle vor

⚠️ **Wichtig:** Voice Commands und Transkription nutzen separate Mikrofon-Instanzen.

### 📊 Analytics Dashboard
- Gesamtstatistiken (Notizen, Dauer, Aktivität)
- Stimmungsverteilung (Positiv/Neutral/Negativ)
- Wöchentliche Aktivitäts-Charts
- Produktivitäts-Score
- Modus-Verteilung

### 📅 Zeitraum-Filter
1. Wähle ein **Jahr** in der Sidebar
2. Wähle optional einen **Monat**
3. Wähle einen **Modus** (Smart Notes, Email, etc.)
4. → Zeigt nur Notizen für diesen Zeitraum, sortiert von neu nach alt

### 👥 Team & Collaboration
- Teammitglieder einladen
- Notizen teilen
- Kommentare auf Notizen
- Rollen-System (Admin, Manager, Mitglied)

### 🔒 Enterprise Security
- Audit Log (alle Aktionen werden protokolliert)
- Rollen-basierte Zugriffsrechte
- DSGVO-Export (alle Daten exportieren)
- Ende-zu-Ende Verschlüsselung (lokal)
- SSO-Vorbereitung (Enterprise)

### 📱 Mobile Support (PWA)
- Als App auf Smartphone installierbar
- Offline-fähig (Beta)
- Push-Notifications (geplant)

### 🌐 Offline-Modus (Beta)
- Lokale Verarbeitung ohne Internet
- 100% Datenschutz
- Aktivierbar in Einstellungen

---

## 🚀 Installation

```bash
# 1. Entpacken
unzip velamind.zip
cd voicemind

# 2. Dependencies installieren
npm install

# 3. (Optional) OpenAI API Key für KI-Zusammenfassungen
cp .env.example .env.local
# Bearbeite .env.local

# 4. Starten
npm run dev
```

Öffne **http://localhost:3000** in **Chrome oder Edge**

---

## 📱 Als Mobile App installieren

### Android (Chrome)
1. Öffne die App in Chrome
2. Tippe auf "Menü" (3 Punkte)
3. Wähle "Zum Startbildschirm hinzufügen"

### iOS (Safari)
1. Öffne die App in Safari
2. Tippe auf "Teilen"
3. Wähle "Zum Home-Bildschirm"

---

## 🗣️ Voice Commands aktivieren

1. Gehe zu **Einstellungen** (in der Sidebar)
2. Aktiviere "Sprachbefehle"
3. Erlaube Mikrofon-Zugriff
4. Sage "VelaMind" + Befehl

**Verfügbare Befehle:**
| Befehl | Aktion |
|--------|--------|
| "VelaMind, markiere als wichtig" | Aktuelle Notiz als wichtig markieren |
| "VelaMind, starte Aufnahme" | Aufnahme starten |
| "VelaMind, stoppe Aufnahme" | Aufnahme beenden |
| "VelaMind, Hilfe" | Verfügbare Befehle vorlesen |

---

## ⌨️ Tastenkürzel

| Kürzel | Aktion |
|--------|--------|
| `Ctrl+Shift+V` | Aufnahme starten/stoppen |
| `Escape` | Aufnahme abbrechen |

---

## 📊 Navigation

| Bereich | Beschreibung |
|---------|--------------|
| **Notizen** | Aufnahme & Notizen-Verwaltung |
| **Analytics** | Statistiken & Charts |
| **Team** | Collaboration & Sharing |
| **Einstellungen** | Voice Commands, Security, Export |

---

## 🔧 Konfiguration

### OpenAI API (für KI-Zusammenfassungen)

```bash
# .env.local
OPENAI_API_KEY=sk-dein-key-hier
OPENAI_MODEL=gpt-3.5-turbo  # oder gpt-4
```

Ohne API Key funktioniert die App mit lokaler Zusammenfassung.

---

## 📁 Projektstruktur

```
voicemind/
├── src/
│   ├── app/
│   │   ├── api/summarize/     # KI API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AnalyticsDashboard.tsx  # 📊 Statistics
│   │   ├── AudioRecorder.tsx       # 🎤 Recording
│   │   ├── AuthScreen.tsx          # 🔐 Login
│   │   ├── Dashboard.tsx           # 📱 Main View
│   │   ├── NoteCard.tsx            # 📝 Note Display
│   │   ├── NotesList.tsx           # 📋 Notes List
│   │   ├── SettingsPanel.tsx       # ⚙️ Settings
│   │   ├── Sidebar.tsx             # 📁 Navigation
│   │   └── TeamPanel.tsx           # 👥 Collaboration
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts # 🎤 Speech API
│   │   └── useVoiceCommands.ts     # 🗣️ Voice Commands
│   ├── lib/
│   │   └── store.ts                # 💾 State Management
│   └── types/
│       └── index.ts                # 📝 TypeScript Types
├── public/
│   └── manifest.json              # 📱 PWA Manifest
└── package.json
```

---

## 🛠️ Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Framework | Next.js 14 |
| UI | React 18 + TailwindCSS |
| State | Zustand |
| Animation | Framer Motion |
| Transkription | Web Speech API |
| KI | OpenAI GPT (optional) |
| PWA | Web App Manifest |

---

## 🌐 Browser-Unterstützung

| Browser | Status |
|---------|--------|
| Chrome | ✅ Empfohlen |
| Edge | ✅ Funktioniert |
| Firefox | ⚠️ Eingeschränkt |
| Safari | ❌ Nicht unterstützt |

---

## 🔮 Geplante Features

- [ ] Speaker Diarization (wer spricht)
- [ ] Deepgram/AssemblyAI Integration
- [ ] Native Mobile Apps (React Native)
- [ ] Real-time Collaboration (WebSocket)
- [ ] Calendar Integration
- [ ] Slack/Teams Integration

---

Made with ❤️ for productive meetings | © 2026 VelaMind
