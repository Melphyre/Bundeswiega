import React from 'react';

export interface IceIciclesBorderProps {
  selectedColor?: string;
  children: React.ReactNode;
  borderStyle?: string;
  className?: string;
  vertical?: boolean;
}

export default function IceIciclesBorder({
  selectedColor,
  children,
  borderStyle,
  className = '',
  vertical = false,
}: IceIciclesBorderProps) {
  const color = selectedColor || 'none';
  const isActive =
    (borderStyle === undefined || borderStyle === 'snow' || borderStyle === 'snow-frame' || borderStyle === 'eiszapfen') &&
    color !== 'none';

  // Willkürlich verteilte Eiszapfen mit unterschiedlichen Längen, Breiten und Abständen
  const icicles = vertical
    ? [
        { id: 1, left: '12%', height: '12px', width: '3px' },
        { id: 2, left: '32%', height: '19px', width: '5px' },
        { id: 3, left: '58%', height: '9px', width: '3px' },
        { id: 4, left: '82%', height: '17px', width: '4px' },
      ]
    : [
        { id: 1, left: '8%', height: '12px', width: '3px' },
        { id: 2, left: '15%', height: '18px', width: '5px' },
        { id: 3, left: '27%', height: '9px', width: '3px' },
        { id: 4, left: '34%', height: '22px', width: '6px' },
        { id: 5, left: '48%', height: '14px', width: '4px' },
        { id: 6, left: '57%', height: '19px', width: '5px' },
        { id: 7, left: '69%', height: '8px', width: '3px' },
        { id: 8, left: '76%', height: '16px', width: '5px' },
        { id: 9, left: '88%', height: '12px', width: '4px' },
        { id: 10, left: '94%', height: '20px', width: '5px' },
      ];

  const snowflakes = vertical
    ? Array.from({ length: 4 }).map((_, i) => ({
        id: i,
        left: `${12 + i * 26}%`,
        size: 10 + (i % 3) * 3,
        duration: 2.0 + (i % 3) * 0.7,
        delay: i * 0.35,
      }))
    : Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        left: `${10 + i * 11}%`,
        size: 11 + (i % 3) * 5,
        duration: 2.1 + (i % 3) * 0.8,
        delay: i * 0.3,
      }));

  return (
    <div
      className={`relative inline-block ${
        vertical ? 'my-3 mx-2' : 'my-4 mx-3'
      } overflow-visible ${className}`}
    >
      {/* Inline-CSS für die fließende Fall-Animation */}
      <style>{`
        @keyframes fallAndFade {
          0% { transform: translateY(-4px) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 0.8; }
          100% { transform: translateY(38px) rotate(140deg); opacity: 0; }
        }
      `}</style>

      {/* Haupt-Namensschild */}
      <div
        className={`relative bg-slate-950 rounded-xl ${
          vertical ? 'px-2 py-1.5' : 'px-6 py-3.5'
        } border border-slate-800 z-10 shadow-xl overflow-visible text-white font-bold`}
      >
        {/* Inhalt / Name (z. B. Test_Uwe) */}
        <div className="relative z-20">{children}</div>

        {/* Willkürliche, unterschiedlich lange Eiszapfen-Dreiecke mit sichtbarerem Glow */}
        {isActive && (
          <div className="absolute inset-x-0 -bottom-4 h-6 pointer-events-none z-30 overflow-visible">
            {icicles.map((icicle) => (
              <div
                key={icicle.id}
                className="absolute bg-white rounded-b-full pointer-events-none"
                style={{
                  left: icicle.left,
                  top: '0px',
                  width: icicle.width,
                  height: icicle.height,
                  clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                  filter: `drop-shadow(0 0 7px ${color})`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rieselnder Schnee */}
      {isActive && (
        <div className="absolute inset-x-0 top-full h-12 pointer-events-none overflow-visible z-40">
          {snowflakes.map((flake) => (
            <div
              key={flake.id}
              className="absolute pointer-events-none"
              style={{
                left: flake.left,
                top: '0px',
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                animation: `fallAndFade ${flake.duration}s infinite linear`,
                animationDelay: `${flake.delay}s`,
                filter: `drop-shadow(0 0 5px ${color})`,
              }}
            >
              <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
                <path
                  d="M12 2v20M17 5l-10 14M7 5l10 14M2 12h20M5 7l14 10M5 17l14-10"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ColorSwatchItem {
  id: string;
  value?: string;
  hex?: string;
  unlocked?: boolean;
  label?: string;
}

export interface ColorSwatchesProps {
  colors: ColorSwatchItem[];
  selectedColor?: string;
  onSelectColor: (color: string) => void;
}

/**
 * ColorSwatches:
 * Rendert nur freigeschaltete Farben (gesperrte Farben komplett ausblenden, kein Schloss)
 */
export function ColorSwatches({ colors, selectedColor, onSelectColor }: ColorSwatchesProps) {
  const unlockedColors = colors.filter((c) => c.id === 'none' || c.unlocked);

  return (
    <div className="grid grid-cols-5 gap-2">
      {unlockedColors.map((colorItem) => {
        const val = colorItem.value || colorItem.hex || '';
        const isSelected = selectedColor === val;
        return (
          <button
            key={colorItem.id}
            type="button"
            onClick={() => onSelectColor(val)}
            className={`w-10 h-10 rounded-lg transition-all ${
              isSelected ? 'ring-2 ring-white scale-105 shadow-lg' : 'opacity-80 hover:opacity-100'
            }`}
            style={{ backgroundColor: val }}
          />
        );
      })}
    </div>
  );
}

