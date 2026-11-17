import React, { useState, useMemo, useEffect } from 'react';
import { matchesGameMode } from '../constants';
import { playButtonSound } from './FriendsModal';

export type ChartModeKey = 'standard' | 'speed' | 'team';

interface StatsHistoryChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: any[];
  initialCategory?: string;
  darkMode: boolean;
}

interface ChartPoint {
  index: number;
  dateLabel: string;
  fullDateLabel: string;
  modeLabel: string;
  timestamp: number;
  avg: number;
  schnaepse: number;
  total: number;
  timeSec: number;
  score: number;
}

const parseGameTimestamp = (g: any, fallbackIndex: number): number => {
  if (g?.created_at) {
    const t = new Date(g.created_at).getTime();
    if (!isNaN(t)) return t;
  }
  if (g?.timestamp) {
    const t = new Date(g.timestamp).getTime();
    if (!isNaN(t)) return t;
  }
  if (g?.date && typeof g.date === 'string') {
    const trimmed = g.date.trim();
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(trimmed);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]) - 1;
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      const t = new Date(year, month, day).getTime();
      if (!isNaN(t)) return t;
    }
    const t = new Date(trimmed).getTime();
    if (!isNaN(t)) return t;
  }
  return fallbackIndex;
};

const formatShortDate = (g: any): string => {
  if (g?.date && typeof g.date === 'string' && g.date.trim()) {
    const parts = g.date.trim().split('.');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.`;
    }
    return g.date.trim();
  }
  const raw = g?.created_at || g?.timestamp;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}.${mon}.`;
    }
  }
  return '—';
};

const formatFullDate = (g: any): string => {
  if (g?.date && typeof g.date === 'string' && g.date.trim()) {
    return g.date.trim();
  }
  const raw = g?.created_at || g?.timestamp;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('de-DE');
    }
  }
  return 'Unbekannt';
};

const getSpeedTimeSec = (g: any): number => {
  if (g?.time_seconds !== undefined && g?.time_seconds !== null && !isNaN(Number(g.time_seconds))) {
    return Number(g.time_seconds);
  }
  if (g?.time !== undefined && g?.time !== null && !isNaN(Number(g.time))) {
    return Number(g.time);
  }
  if (g?.Time !== undefined && g?.Time !== null && !isNaN(Number(g.Time))) {
    return Number(g.Time);
  }
  if (g?.schnaepse !== undefined && g?.schnaepse !== null && !isNaN(Number(g.schnaepse))) {
    return Number(g.schnaepse);
  }
  return 0;
};

const getSpeedGesamtabstand = (g: any): number => {
  const avgVal = Number(g?.avg) || 0;
  const timeVal = getSpeedTimeSec(g);
  const totalRaw =
    g?.total !== undefined && g?.total !== null && !isNaN(Number(g.total))
      ? Number(g.total)
      : undefined;

  if (totalRaw !== undefined && totalRaw > 0) {
    if (timeVal > 0 && Math.abs(totalRaw - (avgVal + timeVal)) < 0.1) {
      return avgVal > 0 ? avgVal : Math.max(0, totalRaw - timeVal);
    }
    return totalRaw;
  }
  return avgVal;
};

const computeNiceAxisScale = (rawMax: number, tickCount = 5): { max: number; ticks: number[] } => {
  const safeMax = rawMax > 0 ? rawMax * 1.12 : 10;
  const roughStep = safeMax / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const fraction = roughStep / magnitude;

  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 1.5) niceFraction = 1.5;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;

  const step = niceFraction * magnitude;
  const niceMax = Math.ceil(safeMax / step) * step;

  const ticks: number[] = [];
  for (let i = 0; i <= Math.round(niceMax / step); i++) {
    ticks.push(Number((i * step).toFixed(4)));
  }

  return { max: niceMax, ticks };
};

export const StatsHistoryChartModal: React.FC<StatsHistoryChartModalProps> = ({
  isOpen,
  onClose,
  games,
  initialCategory = 'standard',
  darkMode
}) => {
  const mapCategoryToMode = (cat?: string): ChartModeKey => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('speed')) return 'speed';
    if (lower.includes('team')) return 'team';
    return 'standard';
  };

  const [activeMode, setActiveMode] = useState<ChartModeKey>(() => mapCategoryToMode(initialCategory));
  const [volumeFilter, setVolumeFilter] = useState<'all' | '500ml' | '0,33L'>('all');

  // Sichtbare Linien je Modus
  const [showAvg, setShowAvg] = useState(true);
  const [showSchnaepse, setShowSchnaepse] = useState(true);
  const [showTotal, setShowTotal] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [showScore, setShowScore] = useState(true);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(mapCategoryToMode(initialCategory));
      setHoveredIndex(null);
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    setHoveredIndex(null);
  }, [activeMode, volumeFilter]);

  const points: ChartPoint[] = useMemo(() => {
    const filtered = (games || []).filter((g) => {
      if (!g || g.disqualified || Number(g.avg) === 999) return false;
      const modeStr = String(g.game_mode || g.mode || '').toLowerCase();
      const isSpeed = modeStr.includes('speed') || g.is_speed_mode === true;
      const isTeam = modeStr.includes('team') || g.is_team_player === true;

      if (activeMode === 'speed') {
        if (!isSpeed) return false;
        if (volumeFilter === '500ml') return matchesGameMode(g.game_mode || g.mode, 'Speedwiegen (500ml)');
        if (volumeFilter === '0,33L') return matchesGameMode(g.game_mode || g.mode, 'Speedwiegen (0,33L)');
        return true;
      }

      if (activeMode === 'team') {
        return isTeam && !isSpeed;
      }

      // Standardspiel (inkl. Turnierspiel wenn nicht Speed/Team)
      if (isSpeed || isTeam) return false;
      if (volumeFilter === '500ml') return matchesGameMode(g.game_mode || g.mode, 'Standardspiel (500ml)');
      if (volumeFilter === '0,33L') return matchesGameMode(g.game_mode || g.mode, 'Standardspiel (0,33L)');
      return true;
    });

    const withTs = filtered.map((g, idx) => {
      const rawAvg = Number(g.avg) || 0;
      const schnaepse = Number(g.schnaepse ?? g.schnapse ?? g.schnaps ?? 0) || 0;
      const isSpeed = activeMode === 'speed';
      const levels =
        g.levels !== undefined && g.levels !== null && !isNaN(Number(g.levels)) && Number(g.levels) > 0
          ? Number(g.levels)
          : 1;
      const timeSec = isSpeed ? getSpeedTimeSec(g) : 0;
      const gesamtabstand = isSpeed ? getSpeedGesamtabstand(g) : rawAvg;
      const avg = isSpeed ? gesamtabstand / levels : rawAvg;
      const speedScore = isSpeed ? Math.round(((gesamtabstand / levels) + (timeSec / levels)) * 100) / 100 : 0;
      const total =
        g.total !== undefined && g.total !== null && !isNaN(Number(g.total)) && Number(g.total) > 0
          ? Number(g.total)
          : Number((avg + schnaepse).toFixed(2));

      return {
        raw: g,
        timestamp: parseGameTimestamp(g, idx),
        avg: Number(avg.toFixed(2)),
        schnaepse,
        total: Number(total.toFixed(2)),
        timeSec: Number(timeSec.toFixed(1)),
        score: speedScore
      };
    });

    withTs.sort((a, b) => a.timestamp - b.timestamp);

    return withTs.map((item, i) => ({
      index: i,
      dateLabel: formatShortDate(item.raw),
      fullDateLabel: formatFullDate(item.raw),
      modeLabel: String(item.raw.game_mode || item.raw.mode || (activeMode === 'speed' ? 'Speedwiegen' : activeMode === 'team' ? 'Teamwiegen' : 'Standardspiel')),
      timestamp: item.timestamp,
      avg: item.avg,
      schnaepse: item.schnaepse,
      total: item.total,
      timeSec: item.timeSec,
      score: item.score
    }));
  }, [games, activeMode, volumeFilter]);

  const seriesConfig = useMemo(() => {
    if (activeMode === 'speed') {
      return [
        {
          id: 'avg',
          label: 'Ø Abstand (g)',
          shortLabel: 'Ø Abstand',
          color: '#3b82f6',
          visible: showAvg,
          toggle: () => setShowAvg(v => !v),
          getValue: (p: ChartPoint) => p.avg,
          formatValue: (v: number) => `${v.toFixed(2)}g`
        },
        {
          id: 'time',
          label: 'Zeit (Sek.)',
          shortLabel: 'Zeit',
          color: '#10b981',
          visible: showTime,
          toggle: () => setShowTime(v => !v),
          getValue: (p: ChartPoint) => p.timeSec,
          formatValue: (v: number) => `${v.toFixed(1)}s`
        },
        {
          id: 'score',
          label: 'Score',
          shortLabel: 'Score',
          color: '#f59e0b',
          visible: showScore,
          toggle: () => setShowScore(v => !v),
          getValue: (p: ChartPoint) => p.score,
          formatValue: (v: number) => `${v.toFixed(2)}`
        }
      ];
    }

    return [
      {
        id: 'avg',
        label: 'Ø Abstand (g)',
        shortLabel: 'Ø Abstand',
        color: '#3b82f6',
        visible: showAvg,
        toggle: () => setShowAvg(v => !v),
        getValue: (p: ChartPoint) => p.avg,
        formatValue: (v: number) => `${v.toFixed(2)}g`
      },
      {
        id: 'schnaepse',
        label: 'Schnäpse',
        shortLabel: 'Schnäpse',
        color: '#ef4444',
        visible: showSchnaepse,
        toggle: () => setShowSchnaepse(v => !v),
        getValue: (p: ChartPoint) => p.schnaepse,
        formatValue: (v: number) => `${v}`
      },
      {
        id: 'total',
        label: 'Total',
        shortLabel: 'Total',
        color: '#f59e0b',
        visible: showTotal,
        toggle: () => setShowTotal(v => !v),
        getValue: (p: ChartPoint) => p.total,
        formatValue: (v: number) => `${v.toFixed(2)}`
      }
    ];
  }, [activeMode, showAvg, showSchnaepse, showTotal, showTime]);

  const visibleSeries = seriesConfig.filter(s => s.visible);

  // Dynamische Y-Achsen-Skalierung ausschließlich auf Basis der aktuell eingeblendeten Linien
  const { max: yMax, ticks: yTicks } = useMemo(() => {
    if (points.length === 0 || visibleSeries.length === 0) {
      return computeNiceAxisScale(10);
    }
    let maxVal = 0;
    for (const p of points) {
      for (const s of visibleSeries) {
        const val = s.getValue(p);
        if (val > maxVal) maxVal = val;
      }
    }
    return computeNiceAxisScale(maxVal);
  }, [points, visibleSeries]);

  if (!isOpen) return null;

  // SVG Layout-Dimensionen
  const svgWidth = Math.max(680, points.length > 18 ? points.length * 36 : 680);
  const svgHeight = 310;
  const padLeft = 48;
  const padRight = 22;
  const padTop = 20;
  const padBottom = 42;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getX = (idx: number): number => {
    if (points.length <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (points.length - 1)) * plotW;
  };

  const getY = (val: number): number => {
    if (yMax <= 0) return padTop + plotH;
    const clamped = Math.max(0, Math.min(val, yMax));
    return padTop + plotH - (clamped / yMax) * plotH;
  };

  const activePoint =
    hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < points.length
      ? points[hoveredIndex]
      : points.length > 0
        ? points[points.length - 1]
        : null;

  const xLabelStep = points.length <= 10 ? 1 : Math.ceil(points.length / 8);

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[92dvh] rounded-3xl border-2 shadow-2xl flex flex-col overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-500/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#238183]/20 text-[#238183] flex items-center justify-center text-lg">
              📈
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                Historische Ergebnis-Entwicklung
              </h3>
              <p className="text-[11px] opacity-60 font-semibold">
                Chronologischer Verlauf deiner Werte im gewählten Spielmodus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playButtonSound();
              onClose();
            }}
            aria-label="Diagramm schließen"
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modus-Reiter (Tabs) & Flaschengrößen-Filter */}
        <div className={`px-4 sm:px-5 py-3 border-b border-gray-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0 ${
          darkMode ? 'bg-slate-950/40' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            {[
              { key: 'standard' as ChartModeKey, icon: '⚖️', label: 'Standardspiel' },
              { key: 'speed' as ChartModeKey, icon: '⚡', label: 'Speedwiegen' },
              { key: 'team' as ChartModeKey, icon: '👥', label: 'Teamwiegen' }
            ].map((tab) => {
              const isSelected = activeMode === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    playButtonSound();
                    setActiveMode(tab.key);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#238183] text-white shadow-md'
                      : darkMode
                        ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeMode !== 'team' && (
            <div className={`flex items-center gap-1 p-1 rounded-xl border self-end sm:self-auto ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}>
              {([
                { key: 'all', label: 'Alle' },
                { key: '500ml', label: '500ml' },
                { key: '0,33L', label: '0,33L' }
              ] as const).map((vol) => (
                <button
                  key={vol.key}
                  type="button"
                  onClick={() => {
                    playButtonSound();
                    setVolumeFilter(vol.key);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    volumeFilter === vol.key
                      ? 'bg-[#238183] text-white shadow-xs'
                      : 'opacity-65 hover:opacity-100'
                  }`}
                >
                  {vol.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Interaktive Toggle-Schaltflächen für einzelne Linien */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {seriesConfig.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    playButtonSound();
                    s.toggle();
                  }}
                  aria-pressed={s.visible}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
                    s.visible
                      ? darkMode
                        ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-gray-900 shadow-sm'
                      : darkMode
                        ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                        : 'bg-gray-100 border-gray-200 text-gray-400 opacity-70'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 transition-opacity"
                    style={{
                      backgroundColor: s.color,
                      opacity: s.visible ? 1 : 0.35
                    }}
                  />
                  <span>{s.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                    s.visible
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-gray-500/15 text-gray-400'
                  }`}>
                    {s.visible ? 'Ein' : 'Aus'}
                  </span>
                </button>
              ))}
            </div>

            <span className="text-[11px] font-bold opacity-60">
              {points.length} {points.length === 1 ? 'Spiel' : 'Spiele'} im Verlauf
            </span>
          </div>

          {/* Aktuell fokussierter Spiel-Datensatz (Hover / letztes Spiel) */}
          {activePoint && visibleSeries.length > 0 && (
            <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
              darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                <span className="px-2 py-0.5 rounded-lg bg-[#238183]/20 text-[#238183] font-black">
                  Spiel #{activePoint.index + 1}
                </span>
                <span>📅 {activePoint.fullDateLabel}</span>
                <span className="opacity-60 hidden sm:inline">• {activePoint.modeLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-black">
                {visibleSeries.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="opacity-75 font-bold">{s.shortLabel}:</span>
                    <span style={{ color: s.color }}>{s.formatValue(s.getValue(activePoint))}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Diagramm-Bereich */}
          {points.length === 0 ? (
            <div className={`p-10 rounded-2xl border text-center space-y-2 ${
              darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="text-3xl">📉</div>
              <p className="text-sm font-bold opacity-75">
                Für diesen Modus liegen noch keine abgeschlossenen Spiele vor.
              </p>
              <p className="text-xs opacity-50">
                Spiele mindestens eine Runde in diesem Modus, um deinen Verlauf zu sehen.
              </p>
            </div>
          ) : visibleSeries.length === 0 ? (
            <div className={`p-10 rounded-2xl border text-center space-y-2 ${
              darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="text-3xl">👁️</div>
              <p className="text-sm font-bold opacity-75">
                Alle Linien sind aktuell ausgeblendet.
              </p>
              <p className="text-xs opacity-50">
                Aktiviere mindestens eine Kennzahl über die Buttons oberhalb des Diagramms.
              </p>
            </div>
          ) : (
            <div className={`p-3 sm:p-4 rounded-2xl border overflow-x-auto ${
              darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto min-w-[560px] select-none"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Horizontale Y-Achsen-Rasterlinien & Werte */}
                {yTicks.map((tick) => {
                  const yPos = getY(tick);
                  const formattedTick = Number.isInteger(tick) ? String(tick) : tick.toFixed(1);
                  return (
                    <g key={`ytick-${tick}`}>
                      <line
                        x1={padLeft}
                        x2={svgWidth - padRight}
                        y1={yPos}
                        y2={yPos}
                        stroke={darkMode ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.2)'}
                        strokeDasharray={tick === 0 ? undefined : '4 4'}
                        strokeWidth={1}
                      />
                      <text
                        x={padLeft - 8}
                        y={yPos + 4}
                        textAnchor="end"
                        fontSize="11"
                        fontWeight="700"
                        fill={darkMode ? '#94a3b8' : '#64748b'}
                      >
                        {formattedTick}
                      </text>
                    </g>
                  );
                })}

                {/* Vertikale Highlight-Linie beim aktiven Punkt */}
                {activePoint && (
                  <line
                    x1={getX(activePoint.index)}
                    x2={getX(activePoint.index)}
                    y1={padTop}
                    y2={padTop + plotH}
                    stroke={darkMode ? 'rgba(45, 212, 191, 0.35)' : 'rgba(35, 129, 131, 0.35)'}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}

                {/* X-Achsen-Labels (chronologischer Verlauf) */}
                {points.map((p, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === points.length - 1;
                  const shouldShow = isFirst || isLast || idx % xLabelStep === 0;
                  if (!shouldShow) return null;
                  return (
                    <text
                      key={`xlabel-${idx}`}
                      x={getX(idx)}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight={activePoint?.index === idx ? '900' : '600'}
                      fill={
                        activePoint?.index === idx
                          ? (darkMode ? '#2dd4bf' : '#238183')
                          : (darkMode ? '#94a3b8' : '#64748b')
                      }
                    >
                      {p.dateLabel}
                    </text>
                  );
                })}

                {/* Linien-Pfade */}
                {visibleSeries.map((s) => {
                  if (points.length === 1) return null;
                  const pathD = points
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(2)} ${getY(s.getValue(p)).toFixed(2)}`)
                    .join(' ');
                  return (
                    <path
                      key={`line-${s.id}`}
                      d={pathD}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2.75}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Datenpunkte je Linie */}
                {visibleSeries.map((s) =>
                  points.map((p, idx) => {
                    const cx = getX(idx);
                    const cy = getY(s.getValue(p));
                    const isFocused = activePoint?.index === idx;
                    return (
                      <circle
                        key={`dot-${s.id}-${idx}`}
                        cx={cx}
                        cy={cy}
                        r={isFocused ? 5.5 : 3.5}
                        fill={s.color}
                        stroke={darkMode ? '#0f172a' : '#ffffff'}
                        strokeWidth={isFocused ? 2 : 1.5}
                      />
                    );
                  })
                )}

                {/* Unsichtbare Hover-/Tap-Zonen für flüssige Interaktion */}
                {points.map((p, idx) => {
                  const colW = points.length <= 1 ? plotW : plotW / (points.length - 1);
                  const xStart = Math.max(padLeft, getX(idx) - colW / 2);
                  const xEnd = Math.min(svgWidth - padRight, getX(idx) + colW / 2);
                  return (
                    <rect
                      key={`hit-${idx}`}
                      x={xStart}
                      y={padTop}
                      width={Math.max(8, xEnd - xStart)}
                      height={plotH + padBottom}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onClick={() => setHoveredIndex(idx)}
                    />
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
