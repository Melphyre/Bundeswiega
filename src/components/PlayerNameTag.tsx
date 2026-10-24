import React from 'react';
import { getNameTagOption, getNameGlowOption, hasActiveNameGlow } from '../constants/nameTagConfig';

interface PlayerNameTagProps {
  name: string;
  colorKey?: string | null;
  glowKey?: string | null;
  className?: string;
  style?: React.CSSProperties;
  asBadge?: boolean;
}

const MATRIX_COLUMNS = [
  { left: '4%', dur: '1.9s', delay: '-0.4s', digits: ['8', '1', '0', '5', '3', '9', '2', '7', '4', '1'] },
  { left: '16%', dur: '2.5s', delay: '-1.5s', digits: ['4', '9', '2', '6', '0', '1', '8', '3', '7', '5'] },
  { left: '29%', dur: '1.7s', delay: '-0.8s', digits: ['1', '5', '7', '3', '8', '0', '4', '9', '2', '6'] },
  { left: '42%', dur: '2.8s', delay: '-2.1s', digits: ['6', '0', '3', '8', '1', '5', '9', '2', '4', '8'] },
  { left: '56%', dur: '2.1s', delay: '-1.1s', digits: ['9', '2', '8', '4', '7', '3', '0', '5', '1', '3'] },
  { left: '70%', dur: '1.8s', delay: '-0.5s', digits: ['3', '7', '1', '9', '5', '2', '8', '0', '6', '4'] },
  { left: '83%', dur: '2.4s', delay: '-1.7s', digits: ['0', '4', '8', '2', '6', '1', '7', '4', '3', '9'] },
  { left: '94%', dur: '2.0s', delay: '-0.9s', digits: ['5', '8', '3', '0', '7', '4', '1', '9', '2', '0'] },
];

const SNOWFLAKES = [
  { char: '❄', left: '4%', size: '14px', dur: '2.8s', delay: '-0.4s', swayClass: 'snow-sway-1', opacity: 0.9 },
  { char: '❅', left: '15%', size: '18px', dur: '3.6s', delay: '-1.8s', swayClass: 'snow-sway-2', opacity: 1 },
  { char: '❆', left: '26%', size: '13px', dur: '4.5s', delay: '-1.1s', swayClass: 'snow-sway-3', opacity: 0.85 },
  { char: '❄', left: '38%', size: '17px', dur: '3.1s', delay: '-2.5s', swayClass: 'snow-sway-1', opacity: 0.95 },
  { char: '❅', left: '50%', size: '15px', dur: '4.2s', delay: '-0.7s', swayClass: 'snow-sway-2', opacity: 0.9 },
  { char: '❆', left: '62%', size: '20px', dur: '2.9s', delay: '-1.9s', swayClass: 'snow-sway-3', opacity: 1 },
  { char: '❄', left: '74%', size: '13px', dur: '4.7s', delay: '-3.2s', swayClass: 'snow-sway-1', opacity: 0.85 },
  { char: '❅', left: '85%', size: '18px', dur: '3.4s', delay: '-1.3s', swayClass: 'snow-sway-2', opacity: 0.95 },
  { char: '❆', left: '94%', size: '15px', dur: '3.9s', delay: '-0.2s', swayClass: 'snow-sway-3', opacity: 0.9 },
];

/**
 * PlayerNameTag:
 * Stellt den Spielernamen entweder standardmäßig oder mit dem freigeschalteten
 * farbigen Namenshintergrund (Rot, Blau, Grün, Gelb, Schwarz, Weiß, Rosa, Türkis) dar.
 * Ab Level 4 kann zusätzlich ein pulsierender Neon-Glow Rahmen (Blau, Rot, Grün, Gelb) aktiv sein.
 */
export const PlayerNameTag: React.FC<PlayerNameTagProps> = ({
  name,
  colorKey,
  glowKey,
  className = '',
  style,
  asBadge = false
}) => {
  const bgOption = getNameTagOption(colorKey);
  const glowOption = getNameGlowOption(glowKey);
  const hasBg = bgOption.id !== 'none';
  const hasGlow = glowOption.id !== 'none';

  if (!hasBg && !hasGlow) {
    return (
      <span className={className} style={style}>
        {name}
      </span>
    );
  }

  const glowClass = hasGlow ? glowOption.glowClass : '';
  const tooltipText = [
    hasBg ? `Hintergrund: ${bgOption.label}` : '',
    hasGlow ? `Neon-Glow: ${glowOption.label}` : ''
  ]
    .filter(Boolean)
    .join(' | ');

  if (!hasBg && hasGlow) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 my-0.5 mx-0.5 rounded-lg font-black tracking-wide transition-all border-2 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-xs ${glowClass} ${className}`}
        style={{
          ['--glow-color' as any]: glowOption.colorHex,
          ...style
        }}
        title={tooltipText}
      >
        <span className="truncate">{name}</span>
      </span>
    );
  }

  const isSpecialBg = bgOption.cssClasses.includes('name-bg-') || bgOption.cssClasses.includes('bg-gradient');

  // Mit farbigem Hintergrund (& evtl. zusätzlichem Neon-Glow Rahmen)
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 ${hasGlow ? 'my-0.5 mx-0.5' : ''} rounded-lg font-black tracking-wide transition-all shadow-xs ${bgOption.cssClasses} ${glowClass} ${className}`}
      style={{
        backgroundColor: isSpecialBg ? undefined : bgOption.bgHex,
        color: bgOption.textHex,
        ...(bgOption.style || {}),
        ...(hasGlow ? { borderColor: glowOption.colorHex, ['--glow-color' as any]: glowOption.colorHex } : {}),
        ...style
      }}
      title={tooltipText}
    >
      {bgOption.animationId === 'lightning' && (
        <>
          <div className="lightning-flash-overlay" />
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-1"
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
          >
            {/* Gezackter Hauptblitz mit Aufgabelung */}
            <path
              className="lightning-svg-bolt"
              d="M 65,0 L 58,18 L 72,25 L 54,42 L 63,45 L 48,60"
            />
            <path
              className="lightning-svg-bolt lightning-svg-branch"
              d="M 72,25 L 90,36 L 84,50"
              style={{ animationDelay: '0.02s' }}
            />
            {/* Sekundärer Blitz (zeitversetzt auf der rechten Seite) */}
            <path
              className="lightning-svg-bolt lightning-bolt-secondary"
              d="M 148,0 L 155,16 L 142,26 L 160,40 L 150,44 L 164,60"
            />
            <path
              className="lightning-svg-bolt lightning-svg-branch lightning-bolt-secondary"
              d="M 142,26 L 126,38 L 132,50"
              style={{ animationDelay: '0.03s' }}
            />
          </svg>
        </>
      )}
      {bgOption.animationId === 'waves' && (
        <>
          {/* SVG Filter für feine, dichte Wasser-Verzerrung und Caustics */}
          <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <filter id="water-distortion" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.045 0.085"
                numOctaves="4"
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="12s"
                  values="0.045 0.085; 0.065 0.115; 0.038 0.075; 0.045 0.085"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="8.5"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </svg>
          <div className="water-surface" />
          <div className="water-caustics" />
        </>
      )}
      {bgOption.animationId === 'matrix' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-1">
          {MATRIX_COLUMNS.map((col, idx) => (
            <div
              key={idx}
              className="matrix-column"
              style={{
                left: col.left,
                animationDuration: col.dur,
                animationDelay: col.delay
              }}
            >
              {col.digits.map((digit, dIdx) => {
                const isLeadingHead = dIdx === col.digits.length - 1;
                const trailOpacity = 0.2 + (dIdx / col.digits.length) * 0.7;
                return (
                  <span
                    key={dIdx}
                    className={isLeadingHead ? 'matrix-head' : undefined}
                    style={{ opacity: isLeadingHead ? 1 : trailOpacity }}
                  >
                    {digit}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {bgOption.animationId === 'carbon' && (
        <div className="carbon-sheen" />
      )}
      {bgOption.animationId === 'glitter' && (
        <>
          <div className="glitter-particles glitter-layer-1" />
          <div className="glitter-particles glitter-layer-2" />
          <div className="glitter-particles glitter-layer-3" />
        </>
      )}
      {bgOption.animationId === 'snow' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-1">
          <div className="snow-ambient-glow" />
          <div className="snow-frost-edge" />
          {SNOWFLAKES.map((flake, idx) => (
            <span
              key={idx}
              className={`snowflake-flake snow-flake ${flake.swayClass}`}
              style={{
                left: flake.left,
                fontSize: flake.size,
                animationDuration: flake.dur,
                animationDelay: flake.delay,
                opacity: flake.opacity
              }}
            >
              {flake.char}
            </span>
          ))}
        </div>
      )}
      <span
        className="relative z-10 truncate"
        style={{
          textShadow: bgOption.animationId === 'matrix'
            ? '0 0 4px #000000, 0 0 8px #000000, 0 0 12px #000000, 0 2px 4px rgba(0, 0, 0, 0.95)'
            : bgOption.animationId === 'carbon'
            ? '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 6px var(--selected-color, #22c55e)'
            : bgOption.animationId === 'glitter'
            ? '0 2px 5px rgba(0, 0, 0, 0.95), 0 0 10px var(--selected-color, #ef4444)'
            : bgOption.animationId === 'snow'
            ? '0 0 4px #000000, 0 0 8px #000000, 0 2px 6px rgba(0, 0, 0, 0.95), 0 0 12px var(--selected-color, #38bdf8), 0 0 20px var(--selected-color, #38bdf8)'
            : (bgOption.animationId === 'fire' || bgOption.animationId === 'lightning' || bgOption.animationId === 'waves')
            ? '0 1px 2px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.9)'
            : undefined
        }}
      >
        {name}
      </span>
    </span>
  );
};

export default PlayerNameTag;
