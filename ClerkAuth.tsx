import React, { createContext, useContext } from 'react';
import {
  ClerkProvider,
  SignInButton as RawSignInButton,
  SignUpButton as RawSignUpButton,
  UserButton as RawUserButton,
  useUser as useRawUser,
  UserProfile as RawUserProfile,
} from '@clerk/clerk-react';

const PUBLISHABLE_KEY =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env?.VITE_CLERK_PUBLISHABLE_KEY || process.env?.CLERK_PUBLISHABLE_KEY)) ||
  (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || (import.meta as any).env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) ||
  '';

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
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  user: null,
  isClerkAvailable: false,
});

function ClerkStateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useRawUser();
  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        user,
        isClerkAvailable: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const SafeClerkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAvailable = isValidClerkKey(PUBLISHABLE_KEY);

  if (!isAvailable) {
    return (
      <AuthContext.Provider value={{ isSignedIn: false, user: null, isClerkAvailable: false }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ClerkStateProvider>{children}</ClerkStateProvider>
    </ClerkProvider>
  );
};

export const useAppUser = () => {
  return useContext(AuthContext);
};

export const SafeSignInButton: React.FC<{ mode?: 'modal' | 'redirect'; children: React.ReactElement }> = ({ mode = 'modal', children }) => {
  const { isClerkAvailable } = useAppUser();

  if (isClerkAvailable) {
    return <RawSignInButton mode={mode}>{children}</RawSignInButton>;
  }

  return children;
};

export const SafeSignUpButton: React.FC<{ mode?: 'modal' | 'redirect'; children: React.ReactElement }> = ({ mode = 'modal', children }) => {
  const { isClerkAvailable } = useAppUser();

  if (isClerkAvailable) {
    return <RawSignUpButton mode={mode}>{children}</RawSignUpButton>;
  }

  return children;
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
