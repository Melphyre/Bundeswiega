import React from 'react';
import { BRAND_COLOR } from '../constants';

interface CsvEditModalProps {
  showCsvEditModal: boolean;
  setShowCsvEditModal: (show: boolean) => void;
  darkMode: boolean;
  csvEditTab: 'standard' | 'speed' | 'team';
  setCsvEditTab: (tab: 'standard' | 'speed' | 'team') => void;
  csvEditRows: string[][];
  csvEditLoading: boolean;
  filteredCsvRows: string[][];
  updateCsvCell: (rowIdx: number, colIdx: number, value: string) => void;
  deleteCsvRow: (rowIdx: number) => void;
  csvEditSuccess: string | null;
  csvEditSaving: boolean;
  saveCsvChanges: () => void;
}

export const CsvEditModal: React.FC<CsvEditModalProps> = ({
  showCsvEditModal,
  setShowCsvEditModal,
  darkMode,
  csvEditTab,
  setCsvEditTab,
  csvEditRows,
  csvEditLoading,
  filteredCsvRows,
  updateCsvCell,
  deleteCsvRow,
  csvEditSuccess,
  csvEditSaving,
  saveCsvChanges
}) => {
  if (!showCsvEditModal) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md">
      <div className={`w-full md:max-w-5xl rounded-t-3xl md:rounded-3xl flex flex-col max-h-[92dvh] shadow-2xl ${
        darkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-500/20 flex-shrink-0">
          <h3 className="text-xl font-black flex items-center space-x-2" style={{ color: BRAND_COLOR }}>
            <span>📋 CSV direkt bearbeiten</span>
          </h3>
          <button onClick={() => setShowCsvEditModal(false)} className="opacity-50 hover:opacity-100 text-xl cursor-pointer">✕</button>
        </div>

        {/* Reiter */}
        <div className="flex border-b border-gray-500/20 px-6 flex-shrink-0 overflow-x-auto">
          {[
            { key: 'standard' as const, label: '🍺 Standardspiel' },
            { key: 'speed' as const, label: '⚡ Speedwiegen' },
            { key: 'team' as const, label: '👥 Teamwiegen' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setCsvEditTab(tab.key)}
              className={`py-3 px-4 font-black text-sm border-b-2 transition-colors cursor-pointer flex-shrink-0 ${
                csvEditTab === tab.key
                  ? 'border-[#238183] text-[#238183]'
                  : 'border-transparent opacity-50'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-xs opacity-60">
                ({csvEditRows.filter(r => {
                  const m = r[1]?.toLowerCase() || '';
                  if (tab.key === 'standard') return m.includes('standardspiel');
                  if (tab.key === 'speed') return m.includes('speedwiegen');
                  if (tab.key === 'team') return m.includes('teamwiegen');
                  return false;
                }).length})
              </span>
            </button>
          ))}
        </div>

        {/* Tabelle */}
        <div className="flex-1 overflow-auto p-4">
          {csvEditLoading ? (
            <div className="flex items-center justify-center h-32">
              <i className="fas fa-spinner animate-spin text-2xl opacity-40"></i>
            </div>
          ) : filteredCsvRows.length === 0 ? (
            <p className="text-xs opacity-60 text-center py-8">
              Keine Einträge für diesen Spielmodus.
            </p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className={`sticky top-0 ${darkMode ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <th className="p-2 text-left font-black uppercase opacity-60">Datum</th>
                  <th className="p-2 text-left font-black uppercase opacity-60">Modus</th>
                  <th className="p-2 text-left font-black uppercase opacity-60">Name</th>
                  <th className="p-2 text-left font-black uppercase opacity-60">Ø Abstand</th>
                  <th className="p-2 text-left font-black uppercase opacity-60">Schnäpse</th>
                  <th className="p-2 text-left font-black uppercase opacity-60">Total</th>
                  <th className="p-2 text-center font-black uppercase opacity-60">Löschen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCsvRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={`border-b ${darkMode ? 'border-white/10' : 'border-black/10'} hover:bg-black/5`}>
                    {[0, 1, 2, 3, 4, 5].map(colIdx => (
                      <td key={colIdx} className="p-1">
                        <input
                          type="text"
                          value={row[colIdx] || ''}
                          onChange={e => updateCsvCell(rowIdx, colIdx, e.target.value)}
                          className={`w-full p-1.5 rounded-lg border font-bold bg-transparent text-xs ${
                            darkMode ? 'border-white/20' : 'border-black/20'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <button
                        onClick={() => deleteCsvRow(rowIdx)}
                        className="w-full p-1.5 rounded-lg bg-red-500/10 text-red-500 font-bold text-xs hover:bg-red-500/20"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-500/20 flex items-center justify-between flex-shrink-0">
          <div>
            {csvEditSuccess && (
              <span className={`text-xs font-bold ${csvEditSuccess.startsWith('✅') ? 'text-emerald-500' : 'text-red-500'}`}>
                {csvEditSuccess}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowCsvEditModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border opacity-60 hover:opacity-100 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={saveCsvChanges}
              disabled={csvEditSaving}
              className="px-5 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-opacity disabled:opacity-50"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              {csvEditSaving ? 'Speichern...' : '💾 Änderungen speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvEditModal;
