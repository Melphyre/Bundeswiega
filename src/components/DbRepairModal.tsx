import React from 'react';

interface DbRepairModalProps {
  showDbRepairModal: boolean;
  setShowDbRepairModal: (show: boolean) => void;
  darkMode: boolean;
  dbRepairLoading: boolean;
  dbRepairResult: {
    success: boolean;
    report?: string[];
    fixes?: string[];
    errors?: string[];
  } | null;
  setDbRepairResult: (r: any) => void;
  handleDbRepair: () => void;
}

export const DbRepairModal: React.FC<DbRepairModalProps> = ({
  showDbRepairModal,
  setShowDbRepairModal,
  darkMode,
  dbRepairLoading,
  dbRepairResult,
  setDbRepairResult,
  handleDbRepair
}) => {
  if (!showDbRepairModal) return null;

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className={`rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 border-2 ${
        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
      } max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 border-gray-500/20 flex-shrink-0">
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center space-x-2 text-red-500">
            <i className="fas fa-tools"></i>
            <span>Datenbank bereinigen & reparieren</span>
          </h3>
          <button
            type="button"
            onClick={() => { setShowDbRepairModal(false); setDbRepairResult(null); }}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-50 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
          <p className="opacity-70 leading-relaxed">
            Diese Funktion prüft alle Tabellen (Profiles, Game Results, Achievements, Friendships) auf Inkonsistenzen, korrigiert fehlerhafte Summen, erstellt fehlende Profile und sichert alle verwaisten Daten automatisch vor der Reparatur in den Blob-Backups.
          </p>

          {dbRepairLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <i className="fas fa-spinner animate-spin text-3xl text-red-500"></i>
              <p className="font-bold text-sm">Datenbank wird geprüft und bereinigt...</p>
              <p className="opacity-60 text-xs">Erstelle Sicherheits-Backup in /backups/...</p>
            </div>
          )}

          {dbRepairResult && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-3 rounded-xl font-bold flex items-center space-x-2 ${
                dbRepairResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                  : 'bg-red-500/10 border border-red-500/30 text-red-500'
              }`}>
                <i className={`fas ${dbRepairResult.success ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                <span>
                  {dbRepairResult.success
                    ? 'Bereinigung erfolgreich abgeschlossen!'
                    : 'Bereinigung mit Fehlern abgeschlossen'}
                </span>
              </div>

              {/* Report */}
              {dbRepairResult.report && dbRepairResult.report.length > 0 && (
                <div className={`p-3 rounded-xl space-y-1 font-mono text-[11px] ${
                  darkMode ? 'bg-black/40 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  <p className="font-black text-xs text-blue-400 mb-1">📋 Diagnosebericht:</p>
                  {dbRepairResult.report.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              )}

              {/* Fixes */}
              {dbRepairResult.fixes && dbRepairResult.fixes.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
                  <p className="font-black text-xs mb-1">🔧 Durchgeführte Reparaturen ({dbRepairResult.fixes.length}):</p>
                  {dbRepairResult.fixes.map((fix, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5">
                      <span>{fix}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {dbRepairResult.errors && dbRepairResult.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 space-y-1">
                  <p className="font-black text-xs mb-1">❌ Fehler ({dbRepairResult.errors.length}):</p>
                  {dbRepairResult.errors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 pt-2 border-t border-gray-500/20 flex-shrink-0">
          <button
            type="button"
            onClick={() => { setShowDbRepairModal(false); setDbRepairResult(null); }}
            className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase cursor-pointer ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-black/5'
            }`}
          >
            Schließen
          </button>
          <button
            type="button"
            onClick={handleDbRepair}
            disabled={dbRepairLoading}
            className="flex-1 py-3 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow active:scale-95 disabled:opacity-50 cursor-pointer bg-red-600 hover:bg-red-700 transition-colors"
          >
            {dbRepairLoading ? 'Repariere...' : dbRepairResult ? 'Erneut ausführen' : 'Bereinigung starten'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DbRepairModal;
