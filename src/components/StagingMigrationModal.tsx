import React, { useState } from 'react';

export interface StagingMigrationResult {
  success: boolean;
  message: string;
  tablesMissing?: boolean;
  missingTables?: string[];
  sql?: string;
  resultsCsvRows?: number;
  tournamentRows?: number;
  tournamentsProcessed?: number;
  timestamp?: string;
  error?: string;
}

interface StagingMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  isLoading: boolean;
  progressMessage: string | null;
  result: StagingMigrationResult | null;
  onStartMigration: (clearExisting: boolean) => void;
}

export const StagingMigrationModal: React.FC<StagingMigrationModalProps> = ({
  isOpen,
  onClose,
  darkMode,
  isLoading,
  progressMessage,
  result,
  onStartMigration
}) => {
  const [clearExisting, setClearExisting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    if (!result?.sql) return;
    navigator.clipboard.writeText(result.sql).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        className={`rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 border-2 max-h-[90vh] overflow-y-auto ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 border-gray-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-500 flex items-center justify-center text-lg">
              <i className="fas fa-layer-group"></i>
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-blue-500">
                Staging-Datenbank
              </h3>
              <p className="text-[11px] opacity-60 font-medium">
                Rohdaten aus Vercel Blob in Supabase Staging-Tabellen laden
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-50 hover:opacity-100 cursor-pointer disabled:opacity-20"
          >
            ✕
          </button>
        </div>

        {/* Beschreibung */}
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
          darkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <p className="font-bold text-blue-400 flex items-center space-x-1.5">
            <i className="fas fa-info-circle"></i>
            <span>Ziel der Staging-Migration:</span>
          </p>
          <ul className="list-disc list-inside space-y-1 opacity-90 pl-1">
            <li>
              <span className="font-semibold text-blue-300">staging_results_csv:</span> Speichert alle Zeilen aus der Haupt-<code>results.csv</code> (Spalten: <code>raw_line</code>, <code>created_at</code>).
            </li>
            <li>
              <span className="font-semibold text-emerald-300">staging_tournaments:</span> Speichert alle relevanten Ergebniszeilen (<code>RESULT;</code> / <code>Ergebnis;</code>) zusammen mit dem Turniernamen (Spalten: <code>tournament_name</code>, <code>raw_line</code>, <code>created_at</code>).
            </li>
          </ul>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center space-y-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="space-y-1">
              <p className="font-bold text-sm text-blue-400">
                {progressMessage || 'Übertrage Daten in Staging-Tabellen...'}
              </p>
              <p className="text-xs opacity-60">
                Vercel Blobs werden gelesen und in Batches an Supabase übertragen.
              </p>
            </div>
          </div>
        )}

        {/* Tables Missing Fallback (Mit SQL zum Kopieren) */}
        {!isLoading && result?.tablesMissing && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <i className="fas fa-exclamation-triangle"></i>
              <span>Staging-Tabellen in Supabase noch nicht vorhanden</span>
            </div>
            <p className="opacity-90 leading-relaxed">
              Die Tabellen <code>staging_results_csv</code> und <code>staging_tournaments</code> wurden in deiner Supabase-Datenbank noch nicht angelegt. Führe das folgende SQL-Skript einmalig im Supabase SQL Editor aus:
            </p>

            {result.sql && (
              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-black/70 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 border border-white/10">
                  {result.sql}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="mt-2.5 w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow cursor-pointer transition-all active:scale-95"
                >
                  <i className={`fas ${copiedSql ? 'fa-check' : 'fa-copy'}`}></i>
                  <span>{copiedSql ? 'SQL erfolgreich kopiert!' : 'SQL in die Zwischenablage kopieren'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onStartMigration(clearExisting)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow cursor-pointer transition-all"
            >
              <i className="fas fa-redo"></i>
              <span>Nach dem Ausführen erneut versuchen</span>
            </button>
          </div>
        )}

        {/* Success Feedback Modal Content */}
        {!isLoading && result?.success && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-emerald-400 font-black text-sm">
              <i className="fas fa-check-circle text-lg"></i>
              <span>Erfolgreich in Staging-Tabellen übertragen!</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className={`p-3.5 rounded-xl border text-center space-y-1 ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                  staging_results_csv
                </span>
                <span className="text-2xl font-black text-blue-500 block">
                  {result.resultsCsvRows ?? 0}
                </span>
                <span className="text-[11px] opacity-75 block">Datensätze</span>
              </div>

              <div className={`p-3.5 rounded-xl border text-center space-y-1 ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
                  staging_tournaments
                </span>
                <span className="text-2xl font-black text-emerald-500 block">
                  {result.tournamentRows ?? 0}
                </span>
                <span className="text-[11px] opacity-75 block">
                  aus {result.tournamentsProcessed ?? 0} Turnieren
                </span>
              </div>
            </div>

            <p className="opacity-75 text-[11px] text-center pt-1">
              {result.message}
            </p>
          </div>
        )}

        {/* General Error Feedback */}
        {!isLoading && result && !result.success && !result.tablesMissing && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center space-x-2">
            <i className="fas fa-times-circle text-base flex-shrink-0"></i>
            <span>{result.message || result.error || 'Fehler bei der Übertragung'}</span>
          </div>
        )}

        {/* Option: Vorher leeren */}
        {!isLoading && (
          <div className="flex items-center space-x-2.5 pt-1 px-1">
            <input
              type="checkbox"
              id="clearExistingStagingCheckbox"
              checked={clearExisting}
              onChange={e => setClearExisting(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="clearExistingStagingCheckbox"
              className="text-xs font-medium opacity-80 cursor-pointer select-none"
            >
              Bestehende Staging-Tabellen vor dem Import leeren (überschreiben)
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className={`flex-1 py-3.5 rounded-xl border-2 font-bold text-xs uppercase cursor-pointer disabled:opacity-40 transition-all ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-black/5'
            }`}
          >
            Schließen
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onStartMigration(clearExisting)}
            className="flex-1 py-3.5 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-lg bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Wird geladen...</span>
              </>
            ) : (
              <>
                <i className="fas fa-cloud-upload-alt"></i>
                <span>{result?.success ? 'Erneut laden' : 'In Staging laden'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StagingMigrationModal;
