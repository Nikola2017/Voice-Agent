'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Share2, 
  MessageSquare, 
  UserPlus,
  Send,
  Link,
  Copy,
  Check,
  Crown,
  Shield,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const MEMBER_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function TeamPanel() {
  const { user, notes, deleteTeamMember, updateMemberRole, getTeamMembers } = useAppStore();
  const [inviteEmail, setInviteEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ email: string; name: string; role: string }[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const sharedNotes = notes.filter(n => n.sharedWith && n.sharedWith.length > 0);

  // Team Members laden
  useEffect(() => {
    const members = getTeamMembers();
    setTeamMembers(members);
  }, [getTeamMembers]);

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      alert(`Einladung gesendet an: ${inviteEmail}`);
      setInviteEmail('');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText('https://velamind.app/invite/abc123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteMember = (email: string) => {
    if (!isAdmin) return;
    if (email === user?.email) {
      alert('Du kannst dich selbst nicht löschen!');
      return;
    }
    if (confirm(`Mitglied "${email}" wirklich löschen?`)) {
      const success = deleteTeamMember(email);
      if (success) {
        setTeamMembers(getTeamMembers());
      }
    }
  };

  const handleRoleChange = (email: string, newRole: 'admin' | 'manager' | 'member') => {
    if (!isAdmin) return;
    const success = updateMemberRole(email, newRole);
    if (success) {
      setTeamMembers(getTeamMembers());
      setEditingRole(null);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Crown className="w-3 h-3" />;
    if (role === 'manager') return <Shield className="w-3 h-3" />;
    return null;
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (role === 'manager') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    return 'Mitglied';
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <Users className="w-6 h-6 text-purple-400" />
        Team & Zusammenarbeit
      </h2>

      {/* Admin Info */}
      {isAdmin && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Du bist Administrator. Du kannst Mitglieder verwalten.
          </p>
        </div>
      )}

      {/* Invite Section */}
      <div className="bg-[#1a1325] rounded-xl p-5 border border-purple-500/10">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-purple-400" />
          Teammitglied einladen
        </h3>
        
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@beispiel.de"
            className="flex-1 px-4 py-2 bg-[#241b2f] border border-purple-500/20 rounded-lg text-sm text-white placeholder-zinc-600"
          />
          <button
            onClick={handleInvite}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-400 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Einladen
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300"
          >
            {copied ? <Check className="w-3 h-3" /> : <Link className="w-3 h-3" />}
            {copied ? 'Kopiert!' : 'Einladungslink kopieren'}
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-[#1a1325] rounded-xl p-5 border border-purple-500/10">
        <h3 className="text-sm font-semibold text-white mb-4">
          Teammitglieder ({teamMembers.length})
        </h3>
        
        <div className="space-y-3">
          {teamMembers.map((member, index) => {
            const isCurrentUser = member.email === user?.email;
            const memberColor = MEMBER_COLORS[index % MEMBER_COLORS.length];
            
            return (
              <div 
                key={member.email}
                className="flex items-center justify-between p-3 bg-[#241b2f] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: memberColor }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      {member.name}
                      {isCurrentUser && (
                        <span className="text-[10px] text-zinc-500">(Du)</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Role Badge / Dropdown */}
                  {isAdmin && !isCurrentUser ? (
                    <div className="relative">
                      <button
                        onClick={() => setEditingRole(editingRole === member.email ? null : member.email)}
                        className={`px-3 py-1.5 rounded border text-xs flex items-center gap-1 ${getRoleColor(member.role)}`}
                      >
                        {getRoleIcon(member.role)}
                        {getRoleLabel(member.role)}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </button>
                      
                      {editingRole === member.email && (
                        <div className="absolute right-0 top-full mt-1 bg-[#1a1325] border border-purple-500/20 rounded-lg shadow-xl z-10 overflow-hidden">
                          {['admin', 'manager', 'member'].map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(member.email, role as any)}
                              className={`w-full px-4 py-2 text-left text-xs hover:bg-purple-500/20 flex items-center gap-2 ${
                                member.role === role ? 'bg-purple-500/10' : ''
                              }`}
                            >
                              {role === 'admin' && <Crown className="w-3 h-3 text-red-400" />}
                              {role === 'manager' && <Shield className="w-3 h-3 text-orange-400" />}
                              {role === 'member' && <Users className="w-3 h-3 text-blue-400" />}
                              {getRoleLabel(role)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className={`px-3 py-1.5 rounded border text-xs flex items-center gap-1 ${getRoleColor(member.role)}`}>
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </span>
                  )}

                  {/* Delete Button (nur für Admins) */}
                  {isAdmin && !isCurrentUser && (
                    <button
                      onClick={() => handleDeleteMember(member.email)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Mitglied löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {teamMembers.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">
              Noch keine Teammitglieder
            </p>
          )}
        </div>
      </div>

      {/* Shared Notes */}
      <div className="bg-[#1a1325] rounded-xl p-5 border border-purple-500/10">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-400" />
          Geteilte Notizen ({sharedNotes.length})
        </h3>
        
        {sharedNotes.length > 0 ? (
          <div className="space-y-2">
            {sharedNotes.map((note) => (
              <div 
                key={note.id}
                className="flex items-center justify-between p-3 bg-[#241b2f] rounded-lg"
              >
                <div>
                  <p className="text-sm text-white">{note.title}</p>
                  <p className="text-xs text-zinc-500">
                    Geteilt mit: {note.sharedWith?.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">
            Noch keine geteilten Notizen
          </p>
        )}
      </div>

      {/* Quick Info */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-5 border border-purple-500/20">
        <h3 className="text-sm font-semibold text-white mb-2">
          💡 Tipp: Schnelles Teilen
        </h3>
        <p className="text-xs text-zinc-400">
          Klicke bei einer Notiz auf das Teilen-Symbol um sie mit Teammitgliedern zu teilen.
        </p>
      </div>
    </div>
  );
}
