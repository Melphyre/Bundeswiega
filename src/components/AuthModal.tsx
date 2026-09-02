import React, { useState } from 'react';
import { BRAND_COLOR } from '../constants';

interface AuthModalProps {
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'register' | 'forgot';
  setAuthMode: (mode: 'login' | 'register' | 'forgot') => void;
  authEmailOrUsername: string;
  setAuthEmailOrUsername: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authUsername: string;
  setAuthUsername: (val: string) => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  authSuccess: string | null;
  setAuthSuccess: (succ: string | null) => void;
  authSubmitLoading: boolean;
  handleSignIn: () => Promise<void>;
  handleSignUp: () => Promise<void>;
  handleForgotPassword: () => Promise<void>;
  darkMode: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  showAuthModal,
  setShowAuthModal,
  authMode,
  setAuthMode,
  authEmailOrUsername,
  setAuthEmailOrUsername,
  authPassword,
  setAuthPassword,
  authUsername,
  setAuthUsername,
  authError,
  setAuthError,
  authSuccess,
  setAuthSuccess,
  authSubmitLoading,
  handleSignIn,
  handleSignUp,
  handleForgotPassword,
  darkMode,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  if (!showAuthModal) return null;

  const handleClose = () => {
    setShowAuthModal(false);
    setAuthError(null);
    setAuthSuccess(null);
  };

  const switchMode = (mode: 'login' | 'register' | 'forgot') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthSuccess(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authSubmitLoading) return;

    if (authMode === 'login') {
      handleSignIn();
    } else if (authMode === 'register') {
      handleSignUp();
    } else if (authMode === 'forgot') {
      handleForgotPassword();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 border-2 ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-gray-900'
        } max-h-[92vh] flex flex-col`}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b pb-4 border-gray-500/20 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base shadow-sm"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <i className={authMode === 'forgot' ? 'fas fa-key' : 'fas fa-user-lock'}></i>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">
                {authMode === 'login' && 'Anmelden'}
                {authMode === 'register' && 'Registrieren'}
                {authMode === 'forgot' && 'Passwort Reset'}
              </h3>
              <p className="text-xs opacity-60">1. Bundeswiega Account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector (Login / Register) */}
        {authMode !== 'forgot' && (
          <div className="flex p-1 rounded-2xl bg-gray-500/10 flex-shrink-0">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer text-center ${
                authMode === 'login'
                  ? 'text-white shadow-sm'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={authMode === 'login' ? { backgroundColor: BRAND_COLOR } : {}}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer text-center ${
                authMode === 'register'
                  ? 'text-white shadow-sm'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={authMode === 'register' ? { backgroundColor: BRAND_COLOR } : {}}
            >
              <i className="fas fa-user-plus mr-2"></i>
              Registrieren
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Error Message */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <i className="fas fa-exclamation-circle text-base mt-0.5 flex-shrink-0"></i>
              <span className="leading-relaxed font-medium">{authError}</span>
            </div>
          )}

          {/* Success Message */}
          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <i className="fas fa-check-circle text-base mt-0.5 flex-shrink-0"></i>
              <span className="leading-relaxed font-medium">{authSuccess}</span>
            </div>
          )}

          {/* Mode-Specific Inputs */}
          {authMode === 'forgot' && (
            <div className="space-y-2">
              <p className="text-xs opacity-70 leading-relaxed">
                Gib deine registrierte E-Mail-Adresse ein. Wir senden dir einen sicheren Link zu, mit dem du dein Passwort zurücksetzen kannst.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <input
                    type="email"
                    required
                    value={authEmailOrUsername}
                    onChange={(e) => setAuthEmailOrUsername(e.target.value)}
                    placeholder="name@beispiel.de"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:ring-[#238183]'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#238183]'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {authMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">
                  Benutzername
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                    <i className="fas fa-user-tag"></i>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="Dein gewünschter Spielername"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:ring-[#238183]'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#238183]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <input
                    type="email"
                    required
                    value={authEmailOrUsername}
                    onChange={(e) => setAuthEmailOrUsername(e.target.value)}
                    placeholder="name@beispiel.de"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:ring-[#238183]'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#238183]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">
                  Passwort
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:ring-[#238183]'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#238183]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs opacity-50 hover:opacity-100 cursor-pointer"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            </>
          )}

          {authMode === 'login' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-70">
                  Benutzername oder E-Mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                    <i className="fas fa-user"></i>
                  </div>
                  <input
                    type="text"
                    required
                    value={authEmailOrUsername}
                    onChange={(e) => setAuthEmailOrUsername(e.target.value)}
                    placeholder="Benutzername oder E-Mail eingeben"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:ring-[#238183]'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#238183]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider opacity-70">
                    Passwort
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold hover:underline opacity-70 hover:opacity-100 cursor-pointer"
                    style={{ color: BRAND_COLOR }}
                  >
                    Passwort vergessen?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-40">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Dein Passwort"
                    className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 focus:ring-[#238183]'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#238183]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs opacity-50 hover:opacity-100 cursor-pointer"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={authSubmitLoading}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center space-x-2 shadow-lg hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              {authSubmitLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin text-base"></i>
                  <span>Bitte warten...</span>
                </>
              ) : (
                <>
                  <i
                    className={
                      authMode === 'login'
                        ? 'fas fa-sign-in-alt'
                        : authMode === 'register'
                        ? 'fas fa-user-plus'
                        : 'fas fa-paper-plane'
                    }
                  ></i>
                  <span>
                    {authMode === 'login' && 'Jetzt anmelden'}
                    {authMode === 'register' && 'Account erstellen'}
                    {authMode === 'forgot' && 'Reset-Link senden'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Mode Switch Footers */}
          <div className="pt-3 border-t border-gray-500/15 text-center">
            {authMode === 'login' && (
              <p className="text-xs opacity-70">
                Noch kein Konto?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-bold hover:underline cursor-pointer ml-1"
                  style={{ color: BRAND_COLOR }}
                >
                  Jetzt registrieren
                </button>
              </p>
            )}

            {authMode === 'register' && (
              <p className="text-xs opacity-70">
                Bereits ein Konto?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold hover:underline cursor-pointer ml-1"
                  style={{ color: BRAND_COLOR }}
                >
                  Hier anmelden
                </button>
              </p>
            )}

            {authMode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-bold hover:underline cursor-pointer inline-flex items-center space-x-1.5"
                style={{ color: BRAND_COLOR }}
              >
                <i className="fas fa-arrow-left"></i>
                <span>Zurück zur Anmeldung</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
