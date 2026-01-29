'use client';

import { useState } from 'react';
import { 
  Settings, 
  Mic, 
  Shield, 
  Users, 
  WifiOff,
  History,
  Download,
  Trash2,
  Key,
  Bell,
  Globe
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { LANGUAGES } from '@/types';

export function SettingsPanel() {
  const {
    user,
    voiceCommandsEnabled,
    toggleVoiceCommands,
    offlineMode,
    toggleOfflineMode,
    auditLog,
    clearAuditLog,
    notes,
    currentLanguage,
    setCurrentLanguage,
  } = useAppStore();

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'audit'>('general');

  const exportData = () => {
    const data = {
      user,
      notes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `velamind-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('de-DE');
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6 text-purple-400" />
        Einstellungen
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-purple-500/10 pb-2">
        {[
          { id: 'general', label: 'Allgemein', icon: <Settings className="w-4 h-4" /> },
          { id: 'security', label: 'Sicherheit', icon: <Shield className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Log', icon: <History className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-500/20 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          {/* Voice Commands */}
          <SettingRow
            icon={<Mic className="w-5 h-5" />}
            title="Sprachbefehle"
            description="Sage 'Vela' + Befehl (z.B. 'Vela wichtig')"
            action={
              <ToggleSwitch 
                enabled={voiceCommandsEnabled} 
                onToggle={toggleVoiceCommands} 
              />
            }
          />

          {voiceCommandsEnabled && (
            <div className="ml-12 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm text-green-400 font-medium">Sprachbefehle aktiv</p>
              </div>
              <p className="text-xs text-zinc-400 mb-3">Sage einen Befehl (Wake Word "Vela" optional):</p>
              <ul className="text-xs text-zinc-300 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">→</span> 
                  <code className="px-1.5 py-0.5 bg-purple-500/20 rounded">"wichtig"</code> 
                  <span className="text-zinc-500">- Notiz markieren</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">→</span> 
                  <code className="px-1.5 py-0.5 bg-purple-500/20 rounded">"start aufnahme"</code> 
                  <span className="text-zinc-500">- Aufnahme starten</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">→</span> 
                  <code className="px-1.5 py-0.5 bg-purple-500/20 rounded">"stopp"</code> 
                  <span className="text-zinc-500">- Aufnahme beenden</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">→</span> 
                  <code className="px-1.5 py-0.5 bg-purple-500/20 rounded">"hilfe"</code> 
                  <span className="text-zinc-500">- Befehle vorlesen</span>
                </li>
              </ul>
              <p className="text-[10px] text-zinc-500 mt-3">💡 Tipp: Öffne die Browser-Konsole (F12) um erkannte Befehle zu sehen</p>
            </div>
          )}

          {/* Offline Mode */}
          <SettingRow
            icon={<WifiOff className="w-5 h-5" />}
            title="Offline-Modus"
            description="Lokale Verarbeitung ohne Internetverbindung (Beta)"
            action={
              <ToggleSwitch 
                enabled={offlineMode} 
                onToggle={toggleOfflineMode} 
              />
            }
          />

          {/* Language */}
          <SettingRow
            icon={<Globe className="w-5 h-5" />}
            title="Sprache"
            description="Standard-Sprache für Transkription"
            action={
              <select
                value={currentLanguage}
                onChange={(e) => setCurrentLanguage(e.target.value as any)}
                className="bg-[#241b2f] border border-purple-500/20 rounded-lg px-3 py-2 text-sm text-white"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            }
          />

          {/* Export */}
          <SettingRow
            icon={<Download className="w-5 h-5" />}
            title="Daten exportieren"
            description="DSGVO-Export aller deiner Daten"
            action={
              <button
                onClick={exportData}
                className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-sm hover:bg-purple-500/30"
              >
                Exportieren
              </button>
            }
          />
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* User Role */}
          <SettingRow
            icon={<Users className="w-5 h-5" />}
            title="Benutzerrolle"
            description="Deine aktuelle Berechtigung"
            action={
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                user?.role === 'admin' 
                  ? 'bg-red-500/20 text-red-400' 
                  : user?.role === 'manager'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-blue-500/20 text-blue-400'
              }`}>
                {user?.role === 'admin' ? 'Administrator' : user?.role === 'manager' ? 'Manager' : 'Mitglied'}
              </span>
            }
          />

          {/* SSO Info */}
          <SettingRow
            icon={<Key className="w-5 h-5" />}
            title="Single Sign-On (SSO)"
            description="Enterprise SSO Integration"
            action={
              <span className="px-3 py-1 bg-zinc-500/20 text-zinc-400 rounded-full text-xs">
                Enterprise Plan
              </span>
            }
          />

          {/* Encryption */}
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-400">Ende-zu-Ende Verschlüsselung</p>
                <p className="text-xs text-zinc-500">Alle Daten sind lokal verschlüsselt gespeichert</p>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <SettingRow
            icon={<Trash2 className="w-5 h-5" />}
            title="Datenspeicherung"
            description="Automatische Löschung alter Daten"
            action={
              <select className="bg-[#241b2f] border border-purple-500/20 rounded-lg px-3 py-2 text-sm text-white">
                <option value="never">Nie löschen</option>
                <option value="30">Nach 30 Tagen</option>
                <option value="90">Nach 90 Tagen</option>
                <option value="365">Nach 1 Jahr</option>
              </select>
            }
          />
        </div>
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-zinc-400">
              {auditLog.length} Aktivitäten
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('Einträge älter als 1 Tag löschen?')) clearAuditLog('day');
                }}
                className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20"
              >
                &gt; 1 Tag
              </button>
              <button
                onClick={() => {
                  if (confirm('Einträge älter als 1 Monat löschen?')) clearAuditLog('month');
                }}
                className="px-2 py-1 text-xs bg-orange-500/10 text-orange-400 rounded hover:bg-orange-500/20"
              >
                &gt; 1 Monat
              </button>
              <button
                onClick={() => {
                  if (confirm('Alle Audit-Log Einträge löschen?')) clearAuditLog('all');
                }}
                className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
              >
                Alle löschen
              </button>
              <button
                onClick={exportData}
                className="px-2 py-1 text-xs bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20"
              >
                Export
              </button>
            </div>
          </div>

          <div className="bg-[#1a1325] rounded-xl border border-purple-500/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/10 text-xs text-zinc-500">
                  <th className="text-left p-3">Zeitpunkt</th>
                  <th className="text-left p-3">Benutzer</th>
                  <th className="text-left p-3">Aktion</th>
                  <th className="text-left p-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.slice(0, 50).map((entry) => (
                  <tr key={entry.id} className="border-b border-purple-500/5 hover:bg-white/5">
                    <td className="p-3 text-xs text-zinc-500">
                      {formatDate(entry.timestamp)}
                    </td>
                    <td className="p-3 text-sm text-white">
                      {entry.userName}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        entry.action === 'create' ? 'bg-green-500/20 text-green-400' :
                        entry.action === 'delete' ? 'bg-red-500/20 text-red-400' :
                        entry.action === 'login' ? 'bg-blue-500/20 text-blue-400' :
                        entry.action === 'share' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-zinc-400 max-w-xs truncate">
                      {entry.details}
                    </td>
                  </tr>
                ))}
                {auditLog.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500">
                      Noch keine Aktivitäten aufgezeichnet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1325] rounded-xl border border-purple-500/10">
      <div className="flex items-center gap-4">
        <div className="text-purple-400">{icon}</div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-purple-500' : 'bg-zinc-700'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
