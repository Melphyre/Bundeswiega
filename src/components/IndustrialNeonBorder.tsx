import React from 'react';

export interface IndustrialNeonBorderProps {
  selectedColor?: string;
  children?: React.ReactNode;
  className?: string;
  vertical?: boolean;
  borderStyle?: string;
}

/**
 * IndustrialNeonBorder:
 * Umlaufender doppelter Industrie-Neon-Schlauch mit authentischem Wackelkontakt-Flimmern.
 * - Äußerer Rahmen (-inset-1.5): 2px Kontur mit sattem Glow (0 0 8px)
 * - Innerer Rahmen (inset-0): 1.5px Kontur mit feinem Glow (0 0 5px)
 * - Sauber getrennt: Echter doppelter Schlauch rund um das Namensschild
 * - Flimmer-Animation (@keyframes industrialFlicker)
 */
export default function IndustrialNeonBorder({
  selectedColor = '#06b6d4',
  children,
  className = '',
  vertical = false,
  borderStyle,
}: IndustrialNeonBorderProps) {
  const color = selectedColor || '#06b6d4';

  // Wenn ein anderer Rahmen aktiv ist, diesen Rahmen nicht anzeigen
  if (borderStyle !== undefined && borderStyle !== 'industrial' && borderStyle !== 'cyber' && borderStyle !== 'double-border') {
    return (
      <div className={`relative bg-slate-950 rounded-xl ${vertical ? 'px-2 py-1.5' : 'px-6 py-3.5'} border border-slate-800 ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`relative inline-block ${
        vertical ? 'my-3 mx-2' : 'my-4 mx-4'
      } overflow-visible ${className}`}
      style={{
        ['--neon-color' as any]: color,
      }}
    >
      {/* CSS für das industrielle Flimmern */}
      <style>{`
        @keyframes industrialFlicker {
          0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
            opacity: 0.95;
            filter: drop-shadow(0 0 6px ${color});
          }
          20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
            opacity: 0.3;
            filter: drop-shadow(0 0 2px ${color});
          }
        }
        .animate-industrial-flicker {
          animation: industrialFlicker 3.8s infinite linear !important;
        }
      `}</style>

      {/* Äußerer doppelter Neon-Schlauch (rundherum mit etwas Abstand) */}
      <div
        className="absolute -inset-1.5 rounded-2xl pointer-events-none animate-industrial-flicker z-20"
        style={{
          border: `2px solid ${color}`,
          boxShadow: `0 0 8px ${color}, inset 0 0 4px ${color}`,
        }}
      />

      {/* Innerer doppelter Neon-Schlauch (direkt am Rand) */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none animate-industrial-flicker z-20 opacity-85"
        style={{
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 5px ${color}`,
        }}
      />

      {/* Das eigentliche Namensschild */}
      <div
        className={`relative bg-slate-950 rounded-xl ${
          vertical ? 'px-2 py-1.5' : 'px-6 py-3.5'
        } border border-slate-900 z-10 shadow-2xl text-white font-bold`}
      >
        {children}
      </div>
    </div>
  );
}
