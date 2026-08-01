import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ClerkProvider,
  SignInButton as RawSignInButton,
  SignUpButton as RawSignUpButton,
  UserButton as RawUserButton,
  useUser as useRawUser,
  useClerk,
  UserProfile as RawUserProfile,
} from '@clerk/clerk-react';

const getEnvKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('clerk_publishable_key');
    if (localKey && isValidClerkKey(localKey)) return localKey;
  }
  return (
    (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || (import.meta as any).env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) ||
    (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env?.VITE_CLERK_PUBLISHABLE_KEY || process.env?.CLERK_PUBLISHABLE_KEY)) ||
    ""
  );
};

export const isValidClerkKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed.startsWith('pk_test_') && !trimmed.startsWith('pk_live_')) return false;
  if (trimmed.includes('placeholder')) return false;
  return trimmed.length > 20;
};

interface AuthContextType {
  isSignedIn: boolean;
  user: any;
  isClerkAvailable: boolean;
  openConfigModal: () => void;
  setManualKey: (key: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  user: null,
  isClerkAvailable: false,
  openConfigModal: () => {},
  setManualKey: () => {},
});

function ClerkStateProvider({
  children,
  openConfigModal,
  setManualKey,
}: {
  children: React.ReactNode;
  openConfigModal: () => void;
  setManualKey: (key: string) => void;
}) {
  const { isSignedIn, user } = useRawUser();
  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        user,
        isClerkAvailable: true,
        openConfigModal,
        setManualKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const SafeClerkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeKey, setActiveKey] = useState<string>(getEnvKey());
  const [showModal, setShowModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    const k = getEnvKey();
    if (k) setActiveKey(k);
  }, []);

  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (!isValidClerkKey(trimmed)) {
      setKeyError('Ungültiges Format! Der Key muss mit pk_test_ oder pk_live_ beginnen.');
      return;
    }
    localStorage.setItem('clerk_publishable_key', trimmed);
    setActiveKey(trimmed);
    setShowModal(false);
    setKeyError('');
  };

  const setManualKey = (key: string) => {
    localStorage.setItem('clerk_publishable_key', key.trim());
    setActiveKey(key.trim());
  };

  const isAvailable = isValidClerkKey(activeKey);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: false,
        user: null,
        isClerkAvailable: isAvailable,
        openConfigModal: () => setShowModal(true),
        setManualKey,
      }}
    >
      {isAvailable ? (
        <ClerkProvider publishableKey={activeKey}>
          <ClerkStateProvider openConfigModal={() => setShowModal(true)} setManualKey={setManualKey}>
            {children}
          </ClerkStateProvider>
        </ClerkProvider>
      ) : (
        children
      )}

      {/* Custom Modal fallback when key is not configured */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-gray-900 border border-gray-700 text-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center space-x-2 text-teal-400">
                <span>🔐</span>
                <span>Clerk Integration</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              Für die Anmeldung &amp; Registrierung wird ein <strong>Clerk Publishable Key</strong> benötigt.
            </p>

            <div className="bg-gray-800/90 border border-gray-700 rounded-2xl p-4 text-xs space-y-2 text-gray-300">
              <p className="font-semibold text-white">1. In Environment Variables setzen:</p>
              <code className="block bg-black/50 p-2 rounded text-teal-300 font-mono select-all">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
              </code>
              <p className="pt-1 font-semibold text-white">2. Oder Key direkt hier eingeben zum Testen:</p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="pk_test_..."
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setKeyError('');
                }}
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-gray-700 text-white text-sm focus:outline-none focus:border-teal-400 font-mono"
              />
              {keyError && <p className="text-xs text-red-400 font-medium">{keyError}</p>}
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={handleSaveKey}
                className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm cursor-pointer transition-all shadow-lg"
              >
                Key Speichern &amp; Aktivieren
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAppUser = () => {
  return useContext(AuthContext);
};

export const SafeSignInButton: React.FC<{ mode?: 'modal' | 'redirect'; children: React.ReactElement }> = ({ mode = 'modal', children }) => {
  const { isClerkAvailable, openConfigModal } = useAppUser();

  if (isClerkAvailable) {
    return <RawSignInButton mode={mode}>{children}</RawSignInButton>;
  }

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      if (children.props.onClick) children.props.onClick(e);
      openConfigModal();
    },
  });
};

export const SafeSignUpButton: React.FC<{ mode?: 'modal' | 'redirect'; children: React.ReactElement }> = ({ mode = 'modal', children }) => {
  const { isClerkAvailable, openConfigModal } = useAppUser();

  if (isClerkAvailable) {
    return <RawSignUpButton mode={mode}>{children}</RawSignUpButton>;
  }

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      if (children.props.onClick) children.props.onClick(e);
      openConfigModal();
    },
  });
};

export const SafeUserButton: React.FC = () => {
  const { isClerkAvailable } = useAppUser();
  if (isClerkAvailable) {
    return <RawUserButton />;
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
