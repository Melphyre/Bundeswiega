import React from 'react';

export interface MatrixCodeBorderProps {
  selectedColor?: string;
  children: React.ReactNode;
  borderStyle?: string;
  className?: string;
  vertical?: boolean;
}

export default function MatrixCodeBorder({
  selectedColor,
  children,
  borderStyle,
  className = '',
  vertical = false,
}: MatrixCodeBorderProps) {
  const color = selectedColor || '#22c55e'; // Standard Grün oder gewählte Farbe
  const isActive =
    (borderStyle === undefined || borderStyle === 'matrix' || borderStyle === 'matrix-frame') &&
    color !== 'none';

  // Zufällige digitale Zeichen (Ziffern) für den Matrix-Regen
  const matrixChars = ['1', '0', '4', '7', '9', '3', '8', '2', '5', '6'];

  const codeStreams = vertical
    ? Array.from({ length: 4 }).map((_, i) => ({
        id: i,
        left: `${15 + i * 25}%`,
        char: matrixChars[i % matrixChars.length],
        duration: 1.8 + (i % 3) * 0.6,
        delay: i * 0.25,
        fontSize: 11 + (i % 3) * 3,
      }))
    : Array.from({ length: 9 }).map((_, i) => ({
        id: i,
        left: `${10 + i * 10}%`,
        char: matrixChars[i % matrixChars.length],
        duration: 1.8 + (i % 3) * 0.6,
        delay: i * 0.25,
        fontSize: 11 + (i % 3) * 3,
      }));

  return (
    <div className={`relative inline-block ${vertical ? 'my-3 mx-2' : 'my-4 mx-3'} overflow-visible ${className}`}>
      {/* Inline-CSS für den fließenden Matrix-Zahlen-Fall */}
      <style>{`
        @keyframes matrixRain {
          0% {
            transform: translateY(-2px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(35px);
            opacity: 0;
          }
        }
      `}</style>

      {/* Haupt-Namensschild */}
      <div className={`relative bg-slate-950 rounded-xl ${vertical ? 'px-2 py-1.5' : 'px-6 py-3.5'} border border-slate-800 z-10 shadow-xl overflow-visible text-white font-bold`}>
        <div className="relative z-20">{children}</div>
      </div>

      {/* Rieselnder digitaler Matrix-Code unterhalb des Namensschildes */}
      {isActive && (
        <div className="absolute inset-x-0 top-full h-12 pointer-events-none overflow-visible z-40">
          {codeStreams.map((stream) => (
            <div
              key={stream.id}
              className="absolute font-mono font-bold select-none pointer-events-none"
              style={{
                left: stream.left,
                top: '2px',
                fontSize: `${stream.fontSize}px`,
                color: color,
                animation: `matrixRain ${stream.duration}s infinite linear`,
                animationDelay: `${stream.delay}s`,
                filter: `drop-shadow(0 0 5px ${color})`,
              }}
            >
              {stream.char}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
