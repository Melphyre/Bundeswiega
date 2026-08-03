import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

const DEFAULT_KEY = 'pk_test_ZW5hYmxpbmctaGlwcG8tNzYuY2xlcmsuYWNjb3VudHMuZGV2JA==';

function getPublishableKey(): string {
  const candidate = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!candidate || typeof candidate !== 'string') return DEFAULT_KEY;
  if (!candidate.startsWith('pk_test_') && !candidate.startsWith('pk_live_')) return DEFAULT_KEY;
  try {
    const parts = candidate.split('_');
    if (parts.length < 3) return DEFAULT_KEY;
    const decoded = atob(parts[2]);
    if (!decoded || !decoded.endsWith('$')) return DEFAULT_KEY;
    return candidate;
  } catch {
    return DEFAULT_KEY;
  }
}

const publishableKey = getPublishableKey();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      clerkJSUrl="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
