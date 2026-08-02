import React, { createContext, useContext, useState } from 'react';
import {
  ClerkProvider,
  UserButton as RawUserButton,
  useUser as useRawUser,
  UserProfile as RawUserProfile,
  useClerk,
  SignIn,
  SignUp,
} from '@clerk/clerk-react';

const HARDCODED_CLERK_KEY = 'pk_test_ZW5hYmxpbmctaGlwcG8tNzYuY2xlcmsuYWNjb3VudHMuZGV2';

const sanitizeKey = (k?: string): string => {
  if (!k || typeof k !== 'string') return '';
  return k.trim().replace(/\$$/, '');
};

/**
 * Liest den Publishable Key aus URL, localStorage, Environment-Variablen oder Window aus.
 */
export const getPublishableKey = (): string => {
  let key = '';

  // 0. Check URL search params in AI Studio preview (e.g. ?clerk_key=pk_test_...)
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlKey = urlParams.get('clerk_key') || urlParams.get('clerk_publishable_key');
      if (urlKey && isValidClerkKey(urlKey)) {
        localStorage.setItem('CLERK_PUBLISHABLE_KEY', sanitizeKey(urlKey));
        key = urlKey;
      }
    } catch (e) {
      // ignore
    }
  }

  // 1. Check localStorage (manual entry in AI Studio preview)
  if (!key && typeof window !== 'undefined') {
    try {
      key =
        localStorage.getItem('CLERK_PUBLISHABLE_KEY') ||
        localStorage.getItem('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') ||
        localStorage.getItem('VITE_CLERK_PUBLISHABLE_KEY') ||
        '';
    } catch (e) {
      // ignore
    }
  }

  // 2. Check Next.js / Node.js Process Environment
  if (!key && typeof process !== 'undefined' && process.env) {
    key =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      '';
  }

  // 3. Check Vite Environment (import.meta.env)
  if (!key && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    key =
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      env.VITE_CLERK_PUBLISHABLE_KEY ||
      env.CLERK_PUBLISHABLE_KEY ||
      env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      '';
  }

  // 4. Check globale Fenster-Objekte (z. B. bei Custom Injections)
  if (!key && typeof window !== 'undefined') {
    const win = window as any;
    key =
      win.__ENV__?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      win.__ENV__?.VITE_CLERK_PUBLISHABLE_KEY ||
      win.__ENV__?.CLERK_PUBLISHABLE_KEY ||
      win.__ENV__?.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      win.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      win.VITE_CLERK_PUBLISHABLE_KEY ||
      win.CLERK_PUBLISHABLE_KEY ||
      win.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      '';
  }

  if (!key) {
    key = HARDCODED_CLERK_KEY;
  }

  return sanitizeKey(key);
};

export const isValidClerkKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = sanitizeKey(key);
  if (!trimmed.startsWith('pk_test_') && !trimmed.startsWith('pk_live_')) return false;
  if (trimmed.includes('placeholder')) return false;
  return trimmed.length > 20;
};

export const KeyConfigModal: React.FC<{ currentKey: string; onClose?: () => void }> = ({ currentKey, onClose }) => {
  const [inputKey, setInputKey] = useState(currentKey || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = sanitizeKey(inputKey);
    if (!trimmed) {
      setError('Bitte gib einen gültigen Clerk Key ein.');
      return;
    }
    if (!trimmed.startsWith('pk_test_') && !trimmed.startsWith('pk_live_')) {
      setError('Der Key muss mit pk_test_ oder pk_live_ beginnen.');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('CLERK_PUBLISHABLE_KEY', trimmed);
      window.location.reload();
    }
  };

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('CLERK_PUBLISHABLE_KEY');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl text-white space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
          🔑
        </div>
        <div>
          <h2 className="text-base font-bold">Clerk Key in AI Studio Vorschau</h2>
          <p className="text-xs text-gray-400">Gib deinen Clerk Publishable Key ein, um Anmelden/Registrieren in der Vorschau zu testen.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">Clerk Publishable Key:</label>
        <input
          type="text"
          value={inputKey}
          onChange={(e) => { setInputKey(e.target.value); setError(''); }}
          placeholder="pk_test_..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-bold text-gray-200 cursor-pointer"
          >
            Abbrechen
          </button>
        )}
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 rounded-xl text-xs font-bold text-red-300 cursor-pointer"
        >
          Zurücksetzen
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer active:scale-95 transition-all"
        >
          Speichern & Neustarten
        </button>
      </div>
    </div>
  );
};

interface AuthContextType {
  isSignedIn: boolean;
  user: any;
  isClerkAvailable: boolean;
  openSignIn: () => void;
  openSignUp: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  user: null,
  isClerkAvailable: false,
  openSignIn: () => {},
  openSignUp: () => {},
});

function ClerkStateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user, isLoaded } = useRawUser();
  const clerk = useClerk();
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  const openSignIn = () => {
    try {
      if (clerk && typeof clerk.openSignIn === 'function') {
        clerk.openSignIn({});
        return;
      }
    } catch (err) {
      console.warn('clerk.openSignIn modal call failed, redirecting to /sign-in', err);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  };

  const openSignUp = () => {
    try {
      if (clerk && typeof clerk.openSignUp === 'function') {
        clerk.openSignUp({});
        return;
      }
    } catch (err) {
      console.warn('clerk.openSignUp modal call failed, redirecting to /sign-up', err);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-up';
    }
  };

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  if (pathname.startsWith('/sign-in')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="mb-4 flex items-center space-x-3">
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold border border-gray-700 active:scale-95 cursor-pointer"
          >
            ← Zurück zum Spiel
          </button>
          <button
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className="px-3 py-2 bg-indigo-900/50 hover:bg-indigo-800/60 rounded-xl text-xs font-bold border border-indigo-700/50 cursor-pointer"
          >
            🔑 Key konfigurieren
          </button>
        </div>

        {showKeyConfig ? (
          <KeyConfigModal currentKey={getPublishableKey()} onClose={() => setShowKeyConfig(false)} />
        ) : (
          <SignIn routing="path" path="/sign-in" redirectUrl="/" />
        )}
      </div>
    );
  }

  if (pathname.startsWith('/sign-up')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="mb-4 flex items-center space-x-3">
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold border border-gray-700 active:scale-95 cursor-pointer"
          >
            ← Zurück zum Spiel
          </button>
          <button
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className="px-3 py-2 bg-indigo-900/50 hover:bg-indigo-800/60 rounded-xl text-xs font-bold border border-indigo-700/50 cursor-pointer"
          >
            🔑 Key konfigurieren
          </button>
        </div>

        {showKeyConfig ? (
          <KeyConfigModal currentKey={getPublishableKey()} onClose={() => setShowKeyConfig(false)} />
        ) : (
          <SignUp routing="path" path="/sign-up" redirectUrl="/" />
        )}
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        user: isLoaded ? user : null,
        isClerkAvailable: true,
        openSignIn,
        openSignUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const SafeClerkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const key = getPublishableKey();
  const isAvailable = isValidClerkKey(key);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  if (!isAvailable) {
    console.warn(
      'SafeClerkProvider: Kein gültiger Clerk Key gefunden. Aktueller Wert:',
      key ? `"${key.substring(0, 10)}..."` : 'leer'
    );

    const fallbackAuth: AuthContextType = {
      isSignedIn: false,
      user: null,
      isClerkAvailable: false,
      openSignIn: () => {
        console.warn('Clerk publishable key ist nicht konfiguriert oder ungültig.');
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in';
        }
      },
      openSignUp: () => {
        console.warn('Clerk publishable key ist nicht konfiguriert oder ungültig.');
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-up';
        }
      },
    };

    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
          <KeyConfigModal currentKey={key} />
        </div>
      );
    }

    return (
      <AuthContext.Provider value={fallbackAuth}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={key}>
      <ClerkStateProvider>{children}</ClerkStateProvider>
    </ClerkProvider>
  );
};

export const useAppUser = () => {
  return useContext(AuthContext);
};

export const SafeUserButton: React.FC<{ afterSignOutUrl?: string; appearance?: any }> = ({ afterSignOutUrl, appearance }) => {
  const { isClerkAvailable } = useAppUser();
  if (isClerkAvailable) {
    return <RawUserButton afterSignOutUrl={afterSignOutUrl || "/"} appearance={appearance} />;
  }
  return null;
};

export const SafeUserProfile: React.FC<{ appearance?: any }> = ({ appearance }) => {
  const { isClerkAvailable } = useAppUser();
  if (isClerkAvailable) {
    return <RawUserProfile appearance={appearance} />;
  }
  return null;
};


