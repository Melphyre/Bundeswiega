import React from 'react';
import { BRAND_COLOR } from '../constants';

interface TournamentMigrationModalProps {
  showTournamentMigrateModal: boolean;
  setShowTournamentMigrateModal: (show: boolean) => void;
  darkMode: boolean;
  tournamentMigrateStep: 'select' | 'confirm' | 'running' | 'done';
  setTournamentMigrateStep: (step: 'select' | 'confirm' | 'running' | 'done') => void;
  availableTournaments: string[];
  selectedTournament: string;
  setSelectedTournament: (val: string) => void;
  handleTournamentMigrateToCSV: () => void;
  tournamentMigrateProgress: { percent: number; message: string } | null;
  setTournamentMigrateProgress: (p: { percent: number; message: string } | null) => void;
  tournamentMigrateResult: { success: boolean; message: string } | null;
  setTournamentMigrateResult: (r: { success: boolean; message: string } | null) => void;
}

export const TournamentMigrationModal: React.FC<TournamentMigrationModalProps> = ({
  showTournamentMigrateModal,
  setShowTournamentMigrateModal,
  darkMode,
  tournamentMigrateStep,
  setTournamentMigrateStep,
  availableTournaments,
  selectedTournament,
  setSelectedTournament,
  handleTournamentMigrateToCSV,
  tournamentMigrateProgress,
  setTournamentMigrateProgress,
  tournamentMigrateResult,
  setTournamentMigrateResult
}) => {
  if (!showTournamentMigrateModal) return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`rounded-3xl p-6 max-w-sm w-full shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
        <h3 className="text-xl font-black mb-4 flex items-center space-x-2" style={{ color: '#059669' }}>
          <span>🏆 Turnierergebnisse → CSV</span>
        </h3>

        {/* Schritt 1: Turnier auswählen */}
        {tournamentMigrateStep === 'select' && (
          <div className="space-y-4">
            <p className="text-xs opacity-60">
              Wähle das Turnier aus dessen Ergebnisse in die Rekorde-CSV übertragen werden sollen:
            </p>
            {availableTournaments.length === 0 ? (
              <p className="text-xs text-amber-500 font-bold">
                ⚠️ Keine Turnier-Dateien gefunden.
              </p>
            ) : (
              <select
                value={selectedTournament}
                onChange={e => setSelectedTournament(e.target.value)}
                className={`w-full p-3 rounded-xl border-2 font-bold bg-transparent ${
                  darkMode ? 'border-white/20 text-white' : 'border-black/20 text-black'
                }`}
              >
                <option value="" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}>Turnier wählen...</option>
                {availableTournaments.map(name => (
                  <option key={name} value={name} className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}>{name}</option>
                ))}
              </select>
            )}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowTournamentMigrateModal(false)}
                className="flex-1 py-3 rounded-xl border-2 font-bold cursor-pointer text-xs"
                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!selectedTournament}
                onClick={() => setTournamentMigrateStep('confirm')}
                className="flex-1 py-3 rounded-xl text-white font-black cursor-pointer text-xs disabled:opacity-40"
                style={{ backgroundColor: '#059669' }}
              >
                Weiter
              </button>
            </div>
          </div>
        )}

        {/* Schritt 2: Bestätigen */}
        {tournamentMigrateStep === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm font-bold">
              Sollen die Ergebnisse aus dem Turnier
              <span className="text-emerald-500"> "{selectedTournament}" </span>
              in die Rekorde-CSV übertragen werden?
            </p>
            <p className="text-xs opacity-60">
              Bereits vorhandene Einträge werden übersprungen.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setTournamentMigrateStep('select')}
                className="flex-1 py-3 rounded-xl border-2 font-bold cursor-pointer text-xs"
                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={handleTournamentMigrateToCSV}
                className="flex-1 py-3 rounded-xl text-white font-black cursor-pointer text-xs"
                style={{ backgroundColor: '#059669' }}
              >
                Übertragen
              </button>
            </div>
          </div>
        )}

        {/* Schritt 3: Fortschritt und Ergebnis */}
        {(tournamentMigrateStep === 'running' || tournamentMigrateStep === 'done') && (
          <div className="space-y-4">
            {tournamentMigrateProgress && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${tournamentMigrateProgress.percent}%`, backgroundColor: '#059669' }} />
                </div>
                <p className="text-xs font-bold">{tournamentMigrateProgress.message}</p>
              </div>
            )}
            {tournamentMigrateResult && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                tournamentMigrateResult.success
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {tournamentMigrateResult.message}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setShowTournamentMigrateModal(false);
                setTournamentMigrateStep('select');
                setTournamentMigrateProgress(null);
                setTournamentMigrateResult(null);
              }}
              className="w-full py-3 rounded-xl text-white font-black cursor-pointer text-xs"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentMigrationModal;
