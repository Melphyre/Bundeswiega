import React, { createContext, useContext } from 'react';
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
 * Liest den Publishable Key aus den Vercel / Environment Variablen aus.
 */
export const getPublishableKey = (): string => {
  let key = '';

  // 1. Check für Next.js / Node.js Process Environment
  if (typeof process !== 'undefined' && process.env) {
    key =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      '';
  }

  // 2. Check für Vite Environment (import.meta.env)
  if (!key && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    key =
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      env.VITE_CLERK_PUBLISHABLE_KEY ||
      env.CLERK_PUBLISHABLE_KEY ||
      env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      '';
  }

  // 3. Check für globale Fenster-Objekte (z. B. bei Custom Injections)
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
        <div className="mb-4">
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold border border-gray-700 active:scale-95 cursor-pointer"
          >
            ← Zurück zum Spiel
          </button>
        </div>
        <SignIn routing="path" path="/sign-in" redirectUrl="/" />
      </div>
    );
  }

  if (pathname.startsWith('/sign-up')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="mb-4">
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-bold border border-gray-700 active:scale-95 cursor-pointer"
          >
            ← Zurück zum Spiel
          </button>
        </div>
        <SignUp routing="path" path="/sign-up" redirectUrl="/" />
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
          <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-yellow-400">Clerk Key Konfiguration erforderlich</h2>
            <p className="text-sm text-gray-300">
              Bitte hinterlege deinen Clerk Publishable Key (<code className="bg-gray-900 px-2 py-1 rounded text-xs text-green-400">pk_test_...</code>) in Vercel oder in den Umgebungsvariablen (<code className="bg-gray-900 px-2 py-1 rounded text-xs text-green-400">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>).
            </p>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm active:scale-95 text-white cursor-pointer"
            >
              Zurück zum Spiel
            </button>
          </div>
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

