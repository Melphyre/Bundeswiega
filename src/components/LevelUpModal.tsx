import React from 'react';
import { BRAND_COLOR } from '../constants';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import { PlayerTitleBadge } from './PlayerTitleBadge';
import { getRewardForLevel, getTitleForLevel } from '../utils/levelSystem';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  unlockedTitle?: string;
  darkMode?: boolean;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  newLevel,
  unlockedTitle,
  darkMode = false
}) => {
  if (!isOpen) return null;

  const reward = getRewardForLevel(newLevel);
  const titlesToDisplay = reward?.unlockedTitles && reward.unlockedTitles.length > 0
    ? reward.unlockedTitles
    : [unlockedTitle || reward?.unlockedTitle || getTitleForLevel(newLevel)].filter(Boolean) as string[];

  return (
    <div
      className="fixed inset-0 z-[960] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 border-2 text-center relative animate-in zoom-in-95 ${
          darkMode
            ? 'bg-slate-900 border-amber-500/40 text-white'
            : 'bg-white border-amber-400 text-gray-900'
        }`}
      >
        {/* Celebration Header Graphic */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/30 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-white animate-bounce">
          <span>🏆</span>
          <div className="absolute -top-2 -left-2 text-2xl">✨</div>
          <div className="absolute -bottom-1 -right-2 text-2xl">🎉</div>
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-amber-500">
            Stufenaufstieg!
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tight">
            Level-Up!
          </h2>
          <p className="text-sm font-semibold opacity-70">
            Hervorragende Präzision an der Wiege!
          </p>
        </div>

        {/* Level & Title Badges */}
        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <PlayerLevelBadge level={newLevel} size="lg" />
            {titlesToDisplay.map((t, idx) => (
              <PlayerTitleBadge key={idx} title={t} size="md" />
            ))}
          </div>
          <p className="text-xs font-bold text-amber-500 mt-1">
            Du hast Stufe {newLevel} erreicht!
          </p>
        </div>

        {/* Rewards Section (Placeholder & Unlocked Content) */}
        <div className={`p-4 rounded-2xl border text-left space-y-2.5 ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-amber-500">
            <i className="fas fa-gift"></i>
            <span>Freigeschaltete Belohnungen</span>
          </div>

          <div className="space-y-2 text-xs">
            {titlesToDisplay.length > 0 ? (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-base">{reward?.icon || '🏷️'}</span>
                <div>
                  <strong className="block font-black text-amber-600 dark:text-amber-400">
                    {titlesToDisplay.length > 1
                      ? `Neue Titel freigeschaltet: ${titlesToDisplay.map(t => `"${t}"`).join(' & ')}`
                      : `Neuer Titel freigeschaltet: "${titlesToDisplay[0]}"`}
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    {reward?.description || 'Du kannst deinen neuen Titel ab sofort in deinem Profil auswählen!'}
                  </span>
                </div>
              </div>
            ) : null}

            {newLevel === 2 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-base">🎨</span>
                <div>
                  <strong className="block font-black text-blue-600 dark:text-blue-400">
                    Namenshintergründe & Level 2 Quests freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Wähle deinen Namenshintergrund (Rot, Blau, Grün, Gelb) und meistere die neuen Quests für Rosa & Türkis!
                  </span>
                </div>
              </div>
            )}

            {newLevel === 3 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-base">🎨</span>
                <div>
                  <strong className="block font-black text-indigo-600 dark:text-indigo-400">
                    Farben Schwarz & Weiß freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Du kannst deinen Spielernamen nun auch mit edlem Schwarz oder Weiß hervorheben.
                  </span>
                </div>
              </div>
            )}

            {newLevel === 4 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-base">✨</span>
                <div>
                  <strong className="block font-black text-purple-600 dark:text-purple-400">
                    Pulsierender Neon-Glow Rahmen freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Wähle in deinem Profil einen leuchtenden Neon-Glow Rahmen (Blau, Rot, Grün, Gelb).
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 5 */}
            {newLevel === 5 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-base">🪵</span>
                <div>
                  <strong className="block font-black text-amber-600 dark:text-amber-400">
                    Holz-Avatarrahmen & Bronze-Spalte freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Rüste jetzt deinen Eichen-Avatarrahmen und das Bronze-Design für deine In-Game Spalte im Profil aus!
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 6 */}
            {newLevel === 6 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-base">🌿</span>
                <div>
                  <strong className="block font-black text-emerald-600 dark:text-emerald-400">
                    Namenshintergrund "Neon-Mint" freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Dein Name erstrahlt jetzt in einem leuchtenden, modernen Neon-Mintgrün.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 7 */}
            {newLevel === 7 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-slate-500/10 border border-slate-500/20">
                <span className="text-base">🏁</span>
                <div>
                  <strong className="block font-black text-slate-400">
                    Carbon-Design für Ranglisten freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Deine Statistiken und Ranglisten-Einträge erstrahlen ab sofort im sportlichen Carbon-Look.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 8 */}
            {newLevel === 8 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-base">💜</span>
                <div>
                  <strong className="block font-black text-purple-500">
                    Pulsierender lila Glow Avatar-Rahmen freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Dein Profilbild pulsiert ab sofort mit einer mystischen lila Neon-Aura.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 9 */}
            {newLevel === 9 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <span className="text-base">👁️</span>
                <div>
                  <strong className="block font-black text-pink-500">
                    Farbverlauf-Header Spielspalte freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Deine Spielspalte erhält einen fließenden Pink-Indigo-Farbverlauf im Tabellen-Header.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 10 */}
            {newLevel === 10 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-slate-300/10 border border-slate-400/30">
                <span className="text-base">🥈</span>
                <div>
                  <strong className="block font-black text-slate-300">
                    Silber-Meilenstein erreicht!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Glänzender Silber-Metallrahmen und silberne Kontur für deine Ranglisten-Zeilen freigeschaltet.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 11 */}
            {newLevel === 11 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-base">🧬</span>
                <div>
                  <strong className="block font-black text-rose-500">
                    Cyberpunk Pink/Gelb Namenshintergrund freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Fetziger Neon-Verlauf von leuchtendem Pink bis zu glühendem Gelb für deinen Namen.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 12 */}
            {newLevel === 12 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-base">⚡</span>
                <div>
                  <strong className="block font-black text-yellow-500">
                    Elektro-/Blitz-Spaltendesign freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Lass deine In-Game Spalte während des Spiels mit Blitz-Effekten an den Rändern leuchten.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 13 */}
            {newLevel === 13 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <span className="text-base">🔥</span>
                <div>
                  <strong className="block font-black text-orange-500">
                    Feuer-Aura Avatarrahmen freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Dein Profilbild lodert ab jetzt mit einem feurigen Aura-Effekt.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 14 */}
            {newLevel === 14 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-slate-400/10 border border-slate-400/20">
                <span className="text-base">🛡️</span>
                <div>
                  <strong className="block font-black text-slate-300">
                    Gebürsteter Edelstahl Ranglisten-Design freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Deine Tabellenzeilen erstrahlen im massiven Edelstahl-Metallic Look.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 15 */}
            {newLevel === 15 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <span className="text-base">🌌</span>
                <div>
                  <strong className="block font-black text-teal-400">
                    Aurora Borealis Set (Polarlichter) freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Schalte den magischen Aurora-Glow für Profilbild & Namen sowie die edle Gold-Spalte frei!
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 16 */}
            {newLevel === 16 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-base">🪐</span>
                <div>
                  <strong className="block font-black text-indigo-400">
                    Galaxie & Sterne Namenshintergrund freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Tiefes Kosmos-Lila mit schimmernden Sternen-Akzenten für deinen Namen.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 17 */}
            {newLevel === 17 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="text-base">💚</span>
                <div>
                  <strong className="block font-black text-green-400">
                    Matrix Digital-Rahmen freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Pulsierender digitaler Cyber-Code Rahmen in giftigem Matrix-Grün.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 18 */}
            {newLevel === 18 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-blue-600/10 border border-blue-500/20">
                <span className="text-base">👑</span>
                <div>
                  <strong className="block font-black text-blue-400">
                    Königsblau & Gold Ranglisten-Design freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Majestätische königsblaue Zeile mit edlem Gold-Akzent für deine Rekorde.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 19 */}
            {newLevel === 19 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-base">🌊</span>
                <div>
                  <strong className="block font-black text-purple-400">
                    Plasma-Welle Spielspaltendesign freigeschaltet!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Deine Spielspalte pulsiert mit einer futuristischen Plasma-Energiewelle.
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 20 */}
            {newLevel === 20 && (
              <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-base">💎</span>
                <div>
                  <strong className="block font-black text-cyan-400">
                    MAX-LEVEL: Diamant-Gott Status!
                  </strong>
                  <span className="opacity-70 text-[11px] leading-tight block">
                    Prismatischer Diamant-Glow, Rainbow-Aurora Rangliste und Kronen-Header für deine Spielspalte!
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-2.5 p-2 rounded-xl bg-black/5 dark:bg-white/5 opacity-80">
              <span className="text-base">🎁</span>
              <div>
                <strong className="block font-bold">Kommende Belohnungen</strong>
                <span className="opacity-60 text-[11px] leading-tight block">
                  Erreiche höhere Level, um weitere exklusive Spielertitel und Hall-of-Fame-Ehren freizuschalten.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-wider shadow-xl cursor-pointer active:scale-95 transition-all text-sm"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          Belohnungen einstreichen! 🍻
        </button>
      </div>
    </div>
  );
};
