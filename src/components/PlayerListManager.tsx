import React, { useState, useCallback } from 'react';
import QRScannerModal from './QRScannerModal';

export interface PlayerListManagerProps {
  darkMode?: boolean;
  initialPlayers?: string[];
  onPlayersChange?: (players: string[]) => void;
  maxPlayers?: number;
}

export const PlayerListManager: React.FC<PlayerListManagerProps> = ({
  darkMode = true,
  initialPlayers = ['Spieler 1', 'Spieler 2'],
  onPlayersChange,
  maxPlayers = 16,
}) => {
  const [players, setPlayers] = useState<string[]>(initialPlayers);
  const [manualNameInput, setManualNameInput] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Helper to show temporary notification toasts
  const showToast = useCallback((type: 'success' | 'warning' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // Sync internal state with callback
  const updatePlayersList = useCallback((newList: string[]) => {
    setPlayers(newList);
    if (onPlayersChange) {
      onPlayersChange(newList);
    }
  }, [onPlayersChange]);

  // Extract account name from raw string or encoded JSON payload
  const parseScannedAccountName = (scannedText: string): string => {
    const trimmed = scannedText.trim();
    if (!trimmed) return '';

    // 1. Try decoding Base64 JSON (common format in Bundeswiega)
    try {
      const decoded = atob(trimmed);
      const parsed = JSON.parse(decoded);
      if (parsed.userName && typeof parsed.userName === 'string') {
        return parsed.userName.trim();
      }
      if (parsed.name && typeof parsed.name === 'string') {
        return parsed.name.trim();
      }
      if (parsed.accountName && typeof parsed.accountName === 'string') {
        return parsed.accountName.trim();
      }
    } catch {
      // Not base64 encoded
    }

    // 2. Try parsing direct JSON
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.userName && typeof parsed.userName === 'string') {
        return parsed.userName.trim();
      }
      if (parsed.name && typeof parsed.name === 'string') {
        return parsed.name.trim();
      }
      if (parsed.accountName && typeof parsed.accountName === 'string') {
        return parsed.accountName.trim();
      }
    } catch {
      // Not raw JSON
    }

    // 3. Fallback: Treat raw string as the account name
    return trimmed;
  };

  // Add account to players list with duplicate check
  const addPlayerName = useCallback((rawName: string, source: 'manual' | 'qr' = 'manual') => {
    const cleanName = parseScannedAccountName(rawName);

    if (!cleanName) {
      showToast('error', 'Ungültiger oder leerer Accountname.');
      return false;
    }

    if (cleanName.length < 2) {
      showToast('error', 'Der Name muss mindestens 2 Zeichen lang sein.');
      return false;
    }

    // Duplicate check (case-insensitive)
    const isDuplicate = players.some(p => p.trim().toLowerCase() === cleanName.toLowerCase());

    if (isDuplicate) {
      showToast(
        'warning',
        `⚠️ "${cleanName}" ist bereits in der Spielerliste enthalten!`
      );
      return false;
    }

    if (players.length >= maxPlayers) {
      showToast('error', `Maximal ${maxPlayers} Spieler erlaubt.`);
      return false;
    }

    const updated = [...players, cleanName];
    updatePlayersList(updated);

    showToast(
      'success',
      source === 'qr'
        ? `✨ Account "${cleanName}" via QR-Code hinzugefügt!`
        : `✅ Spieler "${cleanName}" hinzugefügt.`
    );
    return true;
  }, [players, maxPlayers, updatePlayersList, showToast]);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (addPlayerName(manualNameInput, 'manual')) {
      setManualNameInput('');
    }
  };

  const handleRemovePlayer = (index: number) => {
    const nameToRemove = players[index];
    const updated = players.filter((_, i) => i !== index);
    updatePlayersList(updated);
    showToast('success', `Spieler "${nameToRemove}" entfernt.`);
  };

  const handleClearAll = () => {
    if (players.length === 0) return;
    updatePlayersList([]);
    showToast('success', 'Alle Spieler wurden entfernt.');
  };

  return (
    <div className={`w-full max-w-xl mx-auto rounded-3xl p-6 shadow-xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-5 border-gray-500/20">
        <div>
          <h2 className="text-xl font-black flex items-center space-x-2">
            <span>👥 Spielerliste</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#238183] text-white font-bold">
              {players.length} / {maxPlayers}
            </span>
          </h2>
          <p className="text-xs opacity-60 mt-0.5">
            Manuell eintragen oder QR-Codes von Smartphones scannen
          </p>
        </div>

        {/* Scan QR Button */}
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="py-2.5 px-4 rounded-2xl bg-[#238183] hover:bg-[#1f7072] text-white font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <i className="fas fa-qrcode text-base"></i>
          <span>QR Scannen</span>
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-3.5 mb-4 rounded-2xl text-xs font-bold flex items-center justify-between border animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : toastMessage.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="opacity-60 hover:opacity-100 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Manual Input Form */}
      <form onSubmit={handleManualAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={manualNameInput}
          onChange={(e) => setManualNameInput(e.target.value)}
          placeholder="Accountname manuell eingeben..."
          className={`flex-1 p-3 rounded-2xl border-2 text-xs font-bold outline-none transition-colors ${
            darkMode
              ? 'bg-slate-800/80 border-slate-700 text-white placeholder-gray-500 focus:border-[#238183]'
              : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#238183]'
          }`}
        />
        <button
          type="submit"
          disabled={!manualNameInput.trim()}
          className="px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
        >
          Hinzufügen
        </button>
      </form>

      {/* Players Card List */}
      <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
        {players.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-500/30 opacity-60">
            <p className="text-sm font-bold">Noch keine Spieler eingetragen.</p>
            <p className="text-xs mt-1">Klicke oben auf "QR Scannen", um Accountnamen per Kamera einzulesen.</p>
          </div>
        ) : (
          players.map((name, idx) => (
            <div
              key={`${name}-${idx}`}
              className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                darkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#238183]/20 text-[#238183] font-black text-xs flex items-center justify-center">
                  #{idx + 1}
                </div>
                <span className="font-bold text-sm tracking-wide">{name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePlayer(idx)}
                title="Spieler entfernen"
                className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer controls */}
      {players.length > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-500/20">
          <span className="text-xs opacity-50 font-bold">
            Gesamt: {players.length} Spieler
          </span>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-bold text-red-400 hover:text-red-300 opacity-80 hover:opacity-100 cursor-pointer"
          >
            Alle löschen
          </button>
        </div>
      )}

      {/* QR Scanner Modal Instance */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedText) => {
          addPlayerName(scannedText, 'qr');
        }}
        title="Account-QR-Code scannen"
        description="Halte den QR-Code vom Smartphone des Spielers vor die Kamera"
        darkMode={darkMode}
      />
    </div>
  );
};

export default PlayerListManager;
