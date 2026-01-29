import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, Note, EnrichmentMode, RecordingState, Language, User, AuditLogEntry, Team } from '@/types';

const USERS_KEY = 'velamind-users';
const ADMIN_EMAIL = 'velamind@velamind.de';

const getUsers = (): Record<string, { password: string; name: string; role: string }> => {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : {};
};

const saveUser = (email: string, password: string, name: string, role: string = 'member') => {
  const users = getUsers();
  users[email] = { password, name, role };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const isAdminEmail = (email: string): boolean => {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface DateFilter {
  year: number | null;
  month: number | null;
  day: number | null;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  isAIAgent: boolean;
  agentPersonality: 'professional' | 'friendly' | 'creative' | 'analytical';
  agentSkills: string[];
}

interface ExtendedAppState extends AppState {
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  clearDateFilter: () => void;
  userProfile: UserProfile | null;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  clearAuditLog: (period: 'all' | 'month' | 'day') => void;
}

export const useAppStore = create<ExtendedAppState>()(
  persist(
    (set, get) => ({
      // Auth State
      user: null,
      isAuthenticated: false,
      team: null,

      // Recording State
      recordingState: 'idle',
      currentMode: 'smart-notes',
      currentLanguage: 'de',
      notes: [],
      selectedNoteId: null,
      sidebarCollapsed: false,
      isEditingTranscript: false,
      editingNoteId: null,
      voiceCommandsEnabled: false,
      offlineMode: false,
      
      // Date Filter
      dateFilter: { year: null, month: null, day: null },
      
      // User Profile
      userProfile: null,
      
      // Audit Log
      auditLog: [],

      // Auth Actions
      login: (email: string, password: string) => {
        const users = getUsers();
        const user = users[email];
        if (user && user.password === password) {
          // VelaMind@velamind.de ist IMMER Admin
          const role = isAdminEmail(email) ? 'admin' : (user.role as 'admin' | 'manager' | 'member') || 'member';
          
          // Speichere Admin-Rolle falls noch nicht gesetzt
          if (isAdminEmail(email) && user.role !== 'admin') {
            saveUser(email, password, user.name, 'admin');
          }
          
          const newUser: User = {
            id: email,
            email,
            name: user.name,
            role: role,
            createdAt: new Date(),
          };
          set({ user: newUser, isAuthenticated: true });
          get().addAuditLog('login', email, 'User logged in');
          console.log('✅ Logged in as:', role);
          return true;
        }
        return false;
      },

      register: (email: string, password: string, name: string) => {
        const users = getUsers();
        if (users[email]) return false;
        
        // VelaMind@velamind.de = Admin, sonst erster User = Admin
        const isFirstUser = Object.keys(users).length === 0;
        const role = (isAdminEmail(email) || isFirstUser) ? 'admin' : 'member';
        
        saveUser(email, password, name, role);
        const newUser: User = {
          id: email,
          email,
          name,
          role: role as 'admin' | 'manager' | 'member',
          createdAt: new Date(),
        };
        set({ user: newUser, isAuthenticated: true });
        get().addAuditLog('login', email, 'User registered as ' + role);
        console.log('✅ Registered as:', role);
        return true;
      },

      logout: () => {
        const user = get().user;
        if (user) {
          get().addAuditLog('logout', user.email, 'User logged out');
        }
        set({ user: null, isAuthenticated: false });
      },

      // Recording Actions
      setRecordingState: (state: RecordingState) => set({ recordingState: state }),
      setCurrentMode: (mode: EnrichmentMode) => set({ currentMode: mode }),
      setCurrentLanguage: (lang: Language) => set({ currentLanguage: lang }),

      // Date Filter Actions
      setDateFilter: (filter: DateFilter) => set({ dateFilter: filter }),
      clearDateFilter: () => set({ dateFilter: { year: null, month: null, day: null } }),

      // User Profile Actions
      updateUserProfile: (profile: Partial<UserProfile>) => {
        const current = get().userProfile || {
          name: get().user?.name || '',
          email: get().user?.email || '',
          phone: '',
          address: '',
          bio: '',
          isAIAgent: false,
          agentPersonality: 'professional' as const,
          agentSkills: [],
        };
        set({ userProfile: { ...current, ...profile } });
      },

      addNote: (note: Note) => {
        set((state) => ({ 
          notes: [note, ...state.notes],
          selectedNoteId: note.id 
        }));
        get().addAuditLog('create', note.id, `Created note: ${note.title}`);
      },

      updateNote: (id: string, updates: Partial<Note>) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id 
              ? { ...note, ...updates, updatedAt: new Date() } 
              : note
          ),
        }));
        get().addAuditLog('update', id, `Updated note`);
      },

      deleteNote: (id: string) => {
        const note = get().notes.find(n => n.id === id);
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
        }));
        get().addAuditLog('delete', id, `Deleted note: ${note?.title}`);
      },

      selectNote: (id: string | null) => set({ selectedNoteId: id }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      setEditingTranscript: (editing: boolean, noteId: string | null = null) =>
        set({ isEditingTranscript: editing, editingNoteId: noteId }),

      toggleVoiceCommands: () => set((state) => ({ 
        voiceCommandsEnabled: !state.voiceCommandsEnabled 
      })),

      toggleOfflineMode: () => set((state) => ({ 
        offlineMode: !state.offlineMode 
      })),

      addComment: (noteId: string, text: string) => {
        const user = get().user;
        if (!user) return;
        
        const comment = {
          id: generateId(),
          noteId,
          userId: user.id,
          userName: user.name,
          text,
          createdAt: new Date(),
        };
        
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? { ...note, comments: [...(note.comments || []), comment] }
              : note
          ),
        }));
        get().addAuditLog('update', noteId, `Added comment`);
      },

      toggleImportant: (noteId: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? { ...note, isImportant: !note.isImportant }
              : note
          ),
        }));
      },

      addAuditLog: (action: AuditLogEntry['action'], target: string, details?: string) => {
        const user = get().user;
        const entry: AuditLogEntry = {
          id: generateId(),
          userId: user?.id || 'system',
          userName: user?.name || 'System',
          action,
          target,
          details,
          timestamp: new Date(),
        };
        set((state) => ({
          auditLog: [entry, ...state.auditLog].slice(0, 1000),
        }));
      },

      clearAuditLog: (period: 'all' | 'month' | 'day') => {
        const now = new Date();
        set((state) => {
          if (period === 'all') {
            return { auditLog: [] };
          }

          const cutoff = new Date();
          if (period === 'month') {
            cutoff.setMonth(cutoff.getMonth() - 1);
          } else if (period === 'day') {
            cutoff.setDate(cutoff.getDate() - 1);
          }

          return {
            auditLog: state.auditLog.filter(entry => new Date(entry.timestamp) > cutoff)
          };
        });
      },

      shareNote: (noteId: string, email: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId
              ? { ...note, sharedWith: [...(note.sharedWith || []), email] }
              : note
          ),
        }));
        get().addAuditLog('share', noteId, `Shared with ${email}`);
      },

      // Team Management (nur für Admins)
      deleteTeamMember: (email: string) => {
        const currentUser = get().user;
        console.log('Delete attempt by:', currentUser?.email, 'role:', currentUser?.role);
        if (currentUser?.role !== 'admin') {
          console.log('❌ Not admin, cannot delete');
          return false;
        }
        
        const users = getUsers();
        if (users[email]) {
          delete users[email];
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          get().addAuditLog('delete', email, `Deleted team member: ${email}`);
          console.log('✅ Deleted member:', email);
          return true;
        }
        return false;
      },

      updateMemberRole: (email: string, newRole: 'admin' | 'manager' | 'member') => {
        const currentUser = get().user;
        console.log('Role update attempt by:', currentUser?.email, 'role:', currentUser?.role);
        if (currentUser?.role !== 'admin') {
          console.log('❌ Not admin, cannot update role');
          return false;
        }
        
        const users = getUsers();
        if (users[email]) {
          users[email].role = newRole;
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          get().addAuditLog('update', email, `Changed role to: ${newRole}`);
          console.log('✅ Updated role for:', email, 'to:', newRole);
          return true;
        }
        return false;
      },

      getTeamMembers: () => {
        const users = getUsers();
        return Object.entries(users).map(([email, data]) => ({
          email,
          name: data.name,
          role: data.role || 'member',
        }));
      },
    }),
    {
      name: 'velamind-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        notes: state.notes,
        currentMode: state.currentMode,
        currentLanguage: state.currentLanguage,
        sidebarCollapsed: state.sidebarCollapsed,
        voiceCommandsEnabled: state.voiceCommandsEnabled,
        offlineMode: state.offlineMode,
        auditLog: state.auditLog,
        dateFilter: state.dateFilter,
        userProfile: state.userProfile,
      }),
    }
  )
);
