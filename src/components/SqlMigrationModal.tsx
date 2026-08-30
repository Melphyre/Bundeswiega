import React from 'react';

interface SqlMigrationModalProps {
  showMigrateModal: boolean;
  setShowMigrateModal: (show: boolean) => void;
  darkMode: boolean;
  migrateProgress: { percent: number; message: string } | null;
  setMigrateProgress: (p: { percent: number; message: string } | null) => void;
  migrateResult: {
    success: boolean;
    message: string;
    details?: {
      total_csv_rows: number;
      migrated: number;
      migrated_from_metadata: number;
      skipped_no_account: number;
      skipped_duplicate: number;
      profiles_updated: number;
      profiles_synced: number;
      errors: number;
    };
  } | null;
  setMigrateResult: (r: any) => void;
  handleMigrateToSQL: () => void;
}

export const SqlMigrationModal: React.FC<SqlMigrationModalProps> = ({
  showMigrateModal,
  setShowMigrateModal,
  darkMode,
  migrateProgress,
  setMigrateProgress,
  migrateResult,
  setMigrateResult,
  handleMigrateToSQL
}) => {
  if (!showMigrateModal) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 border-2 ${
        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
      }`}>
        <div className="flex justify-between items-center border-b pb-4 border-gray-500/20">
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center space-x-2" style={{ color: '#7C3AED' }}>
            <i className="fas fa-database"></i>
            <span>Ergebnisse in SQL übertragen</span>
          </h3>
          <button
            type="button"
            onClick={() => { setShowMigrateModal(false); setMigrateProgress(null); setMigrateResult(null); }}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold opacity-50 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs opacity-70 leading-relaxed">
          Hierüber werden alle historischen Ergebnisse aus der CSV-Datei in die Supabase-Datenbank übertragen, die zu registrierten Benutzer-Accounts passen.
        </p>

        {migrateProgress && (
          <div className="space-y-2 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-gray-500/20">
            <div className="flex justify-between text-xs font-bold">
              <span>{migrateProgress.message}</span>
              <span>{migrateProgress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${migrateProgress.percent}%`, backgroundColor: '#7C3AED' }}
              />
            </div>
          </div>
        )}

        {migrateResult && (
          <div className={`p-4 rounded-xl text-xs font-bold mb-4 space-y-1 ${
            migrateResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            <p>{migrateResult.message}</p>
            {migrateResult.details && (
              <div className="mt-2 space-y-1 opacity-80 border-t border-current/20 pt-2 font-normal">
                <p>📋 CSV Einträge: {migrateResult.details.total_csv_rows}</p>
                <p>✅ Aus CSV migriert: {migrateResult.details.migrated}</p>
                <p>📱 Aus Account-Daten migriert: {migrateResult.details.migrated_from_metadata}</p>
                <p>👤 Ohne Account übersprungen: {migrateResult.details.skipped_no_account}</p>
                <p>🔄 Duplikate übersprungen: {migrateResult.details.skipped_duplicate}</p>
                <p>👥 Profile aktualisiert: {migrateResult.details.profiles_updated}</p>
                <p>👤 Profile synchronisiert: {migrateResult.details.profiles_synced}</p>
                {migrateResult.details.errors > 0 && (
                  <p className="text-red-400 font-bold">❌ Fehler: {migrateResult.details.errors}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setShowMigrateModal(false); setMigrateProgress(null); setMigrateResult(null); }}
            className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase cursor-pointer ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-black/5'
            }`}
          >
            Schließen
          </button>
          {!migrateResult && (
            <button
              type="button"
              onClick={handleMigrateToSQL}
              disabled={!!migrateProgress}
              className="flex-1 py-3 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: '#7C3AED' }}
            >
              {migrateProgress ? 'Wird übertragen...' : 'Starten'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SqlMigrationModal;
