import React, { createContext, useContext } from 'react';
import {
  ClerkProvider,
  UserButton as RawUserButton,
  useUser as useRawUser,
  UserProfile as RawUserProfile,
  useClerk,
} from '@clerk/clerk-react';

export const getPublishableKey = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (process.env.VITE_CLERK_PUBLISHABLE_KEY) return process.env.VITE_CLERK_PUBLISHABLE_KEY;
    if (process.env.CLERK_PUBLISHABLE_KEY) return process.env.CLERK_PUBLISHABLE_KEY;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (env.VITE_CLERK_PUBLISHABLE_KEY) return env.VITE_CLERK_PUBLISHABLE_KEY;
    if (env.CLERK_PUBLISHABLE_KEY) return env.CLERK_PUBLISHABLE_KEY;
  }
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.__ENV__?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return win.__ENV__.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (win.__ENV__?.VITE_CLERK_PUBLISHABLE_KEY) return win.__ENV__.VITE_CLERK_PUBLISHABLE_KEY;
    if (win.__ENV__?.CLERK_PUBLISHABLE_KEY) return win.__ENV__.CLERK_PUBLISHABLE_KEY;
    if (win.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return win.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (win.VITE_CLERK_PUBLISHABLE_KEY) return win.VITE_CLERK_PUBLISHABLE_KEY;
    if (win.CLERK_PUBLISHABLE_KEY) return win.CLERK_PUBLISHABLE_KEY;
  }
  return '';
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
  const { isSignedIn, user } = useRawUser();
  const clerk = useClerk();

  const openSignIn = () => {
    if (clerk?.openSignIn) {
      clerk.openSignIn({});
    }
  };

  const openSignUp = () => {
    if (clerk?.openSignUp) {
      clerk.openSignUp({});
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!isSignedIn,
        user,
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

  if (!isAvailable) {
    const fallbackAuth: AuthContextType = {
      isSignedIn: false,
      user: null,
      isClerkAvailable: false,
      openSignIn: () => {
        console.warn('Clerk publishable key is not configured or invalid.');
      },
      openSignUp: () => {
        console.warn('Clerk publishable key is not configured or invalid.');
      },
    };

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

export const SafeSignInButton: React.FC<{ mode?: 'modal' | 'redirect'; children: React.ReactElement }> = ({ children }) => {
  const { openSignIn } = useAppUser();

  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        if (children.props && typeof children.props.onClick === 'function') {
          children.props.onClick(e);
        }
        openSignIn();
      }
    });
  }

  return <button onClick={() => openSignIn()}>{children}</button>;
};

export const SafeSignUpButton: React.FC<{ mode?: 'modal' | 'redirect'; children: React.ReactElement }> = ({ children }) => {
  const { openSignUp } = useAppUser();

  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        if (children.props && typeof children.props.onClick === 'function') {
          children.props.onClick(e);
        }
        openSignUp();
      }
    });
  }

  return <button onClick={() => openSignUp()}>{children}</button>;
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
