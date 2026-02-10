// Encryption utilities for secure local storage
// Uses AES-256 encryption with the master password as key

const ENCRYPTION_SALT = 'VelaMind2024SecureSalt';

// Simple hash function for creating encryption key
async function createKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password + ENCRYPTION_SALT);

  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);

  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
export async function encryptData(data: string, password: string): Promise<string> {
  try {
    const key = await createKey(password);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
}

// Decrypt data
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  try {
    const key = await createKey(password);

    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );

    // Extract IV and data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed - wrong password?');
  }
}

// Hash password for storage (one-way)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ENCRYPTION_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Check if master password is set
export function isMasterPasswordSet(): boolean {
  return localStorage.getItem('velamind_master_hash') !== null;
}

// Set master password (first time setup)
export async function setMasterPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  localStorage.setItem('velamind_master_hash', hash);
}

// Verify master password
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const storedHash = localStorage.getItem('velamind_master_hash');
  if (!storedHash) return false;
  return verifyPassword(password, storedHash);
}

// Session management
const SESSION_KEY = 'velamind_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function createSession(): void {
  const session = {
    timestamp: Date.now(),
    expires: Date.now() + SESSION_TIMEOUT
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function isSessionValid(): boolean {
  const sessionData = sessionStorage.getItem(SESSION_KEY);
  if (!sessionData) return false;

  try {
    const session = JSON.parse(sessionData);
    return Date.now() < session.expires;
  } catch {
    return false;
  }
}

export function refreshSession(): void {
  if (isSessionValid()) {
    createSession();
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// Activity tracker for auto-logout
let activityTimeout: NodeJS.Timeout | null = null;

export function startActivityTracker(onTimeout: () => void): void {
  const resetTimer = () => {
    if (activityTimeout) clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      clearSession();
      onTimeout();
    }, SESSION_TIMEOUT);
    refreshSession();
  };

  // Track user activity
  ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetTimer, { passive: true });
  });

  resetTimer();
}

export function stopActivityTracker(): void {
  if (activityTimeout) {
    clearTimeout(activityTimeout);
    activityTimeout = null;
  }
}
