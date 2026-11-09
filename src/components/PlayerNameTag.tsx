import React from 'react';
import { getNameTagOption, getNameGlowOption, hasActiveNameGlow } from '../constants/nameTagConfig';

interface PlayerNameTagProps {
  name: string;
  colorKey?: string | null;
  glowKey?: string | null;
  className?: string;
  style?: React.CSSProperties;
  asBadge?: boolean;
  vertical?: boolean;
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

const HEART_PARTICLES = [
  { left: '4%', delay: '0s', dur: '2.1s', size: '10px', char: '♥' },
  { left: '16%', delay: '0.6s', dur: '2.8s', size: '13px', char: '♥' },
  { left: '28%', delay: '1.3s', dur: '2.3s', size: '11px', char: '♥' },
  { left: '42%', delay: '0.2s', dur: '3.0s', size: '14px', char: '♥' },
  { left: '56%', delay: '1.8s', dur: '2.2s', size: '11px', char: '♥' },
  { left: '70%', delay: '0.9s', dur: '2.7s', size: '13px', char: '♥' },
  { left: '84%', delay: '1.5s', dur: '2.5s', size: '10px', char: '♥' },
  { left: '95%', delay: '0.4s', dur: '2.9s', size: '12px', char: '♥' },
];

/**
 * PlayerNameTag:
 * Stellt den Spielernamen entweder standardmäßig oder mit dem freigeschalteten
 * farbigen Namenshintergrund dar.
 * Zudem können verschiedene Namensschild-Rahmen aktiv sein (z. B. Einfacher Rahmen,
 * Pulsierender Neon-Glow, Laufender Laser-Rahmen, Cyber-Rahmen).
 */
export const PlayerNameTag: React.FC<PlayerNameTagProps> = ({
  name,
  colorKey,
  glowKey,
  className = '',
  style,
  asBadge = false,
  vertical = false
}) => {
  const bgOption = getNameTagOption(colorKey);
  const glowOption = getNameGlowOption(glowKey);
  const hasBg = bgOption.id !== 'none';
  const hasGlow = hasActiveNameGlow(glowKey);

  if (!hasBg && !hasGlow) {
    if (vertical) {
      return (
        <span
          className={`inline-flex flex-col items-center justify-center leading-none select-none font-black text-center ${className}`}
          style={style}
        >
          {name.split('').map((char, i) => (
            <span key={i} className="block leading-[1.05] tracking-tight">
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </span>
      );
    }
    return (
      <span className={className} style={style}>
        {name}
      </span>
    );
  }

  const glowClass = hasGlow ? glowOption.glowClass : '';
  const isLaser = hasGlow && glowOption.patternId === 'laser-pulse';
  const isSpecialBg = bgOption.cssClasses.includes('name-bg-') || bgOption.cssClasses.includes('bg-gradient');

  const tooltipText = [
    hasBg ? `Hintergrund: ${bgOption.label}` : '',
    hasGlow ? `Rahmen: ${glowOption.label}` : ''
  ]
    .filter(Boolean)
    .join(' | ');

  // Interne Effekte (Matrix, Blitze, Wellen, Schnee, Glitzer, Carbon) und Text
  const renderInnerContent = () => (
    <>
      {bgOption.animationId === 'lightning' && (
        <>
          <div className="lightning-flash-overlay" />
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-1"
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
          >
            <path
              className="lightning-svg-bolt"
              d="M 65,0 L 58,18 L 72,25 L 54,42 L 63,45 L 48,60"
            />
            <path
              className="lightning-svg-bolt lightning-svg-branch"
              d="M 72,25 L 90,36 L 84,50"
              style={{ animationDelay: '0.02s' }}
            />
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
        className={`relative z-10 ${
          vertical
            ? 'flex flex-col items-center justify-center leading-[0.95] select-none text-center font-black'
            : 'truncate'
        }`}
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
        {vertical
          ? name.split('').map((char, i) => (
              <span key={i} className="block leading-[1.05] tracking-tight">
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))
          : name}
      </span>
    </>
  );

  // SPEZIALFALL: Herzchen-Regen (hearts)
  // Sanft rieselnde Herz-Partikel in der gewählten Rahmen-Farbe um das Namensschild
  const isHeartRain = hasGlow && (glowOption.patternId === 'hearts');

  if (isHeartRain) {
    const heartColor = glowOption.colorHex || '#ec4899';

    return (
      <span
        className={`relative p-[2.5px] rounded-lg overflow-visible ${
          vertical ? 'inline-flex flex-col items-center justify-center' : 'inline-flex items-center'
        } my-0.5 mx-0.5 shadow-md ${className}`}
        style={{
          boxShadow: `0 0 14px ${heartColor}60`,
          ...style
        }}
        title={tooltipText}
      >
        {/* 1. Sanfter Hintergrund-Glow in Spielerfarbe */}
        <div 
          className="absolute inset-0 rounded-lg opacity-40 blur-xs animate-pulse pointer-events-none z-0"
          style={{ backgroundColor: heartColor }}
        />

        {/* 2. Zarter leuchtender Rand */}
        <div 
          className="absolute inset-0 rounded-lg border-2 pointer-events-none z-0"
          style={{
            borderColor: heartColor,
            boxShadow: `0 0 10px ${heartColor}80, inset 0 0 6px ${heartColor}40`
          }}
        />

        {/* 3. Herzchen-Partikel Layer (rieselnder Partikel-Regen) */}
        <div className="absolute -inset-2 pointer-events-none z-20 overflow-hidden rounded-xl">
          {HEART_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute animate-heart-fall font-bold select-none leading-none"
              style={{
                left: p.left,
                fontSize: p.size,
                animationDelay: p.delay,
                animationDuration: p.dur,
                color: heartColor,
                textShadow: `0 0 6px ${heartColor}, 0 0 12px ${heartColor}90`
              }}
            >
              {p.char}
            </span>
          ))}
        </div>

        {/* 4. Deckender innerer Name-Container (z-10, perfekt lesbar im Vordergrund) */}
        <span
          className={`relative z-10 w-full h-full rounded-[6px] ${
            vertical ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]' : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-800'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#06080f',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // SPEZIALFALL: Wandernde Flamme (flame)
  // Reiner Glutpunkt auf der Außenkante (vollständig ohne rotierenden conic-gradient Schleier!)
  const isFlame = hasGlow && glowOption.patternId === 'flame';

  if (isFlame) {
    const flameColor = glowOption.colorHex || '#f97316';

    return (
      <span
        className={`relative ${
          vertical ? 'inline-flex flex-col items-center justify-center' : 'inline-flex items-center'
        } p-[2.5px] rounded-lg overflow-visible my-0.5 mx-0.5 ${className}`}
        style={{
          ...style
        }}
        title={tooltipText}
      >
        {/* Inline-CSS für Funkenflug (Spark Particles) */}
        <style>{`
          @keyframes sparkFade1 {
            0% { transform: scale(1) translate(0, 0); opacity: 1; }
            100% { transform: scale(0.2) translate(-8px, -8px); opacity: 0; }
          }
          @keyframes sparkFade2 {
            0% { transform: scale(1) translate(0, 0); opacity: 1; }
            100% { transform: scale(0.2) translate(7px, -7px); opacity: 0; }
          }
          @keyframes sparkFade3 {
            0% { transform: scale(1) translate(0, 0); opacity: 1; }
            100% { transform: scale(0.2) translate(-6px, 7px); opacity: 0; }
          }
        `}</style>

        {/* Wandernder Glut- und Funkenpunkt auf der Außenkante mit gerichtetem Schweif und Funken */}
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-visible z-20">
          {/* Schweif 7: Ausklingendes Ende */}
          <div className="absolute w-2 h-2 flex items-center justify-center animate-trace-border-trail-7 pointer-events-none opacity-15">
            <div 
              className="w-1 h-1 rounded-full"
              style={{
                backgroundColor: flameColor,
                boxShadow: `0 0 4px 1px ${flameColor}`
              }}
            />
          </div>

          {/* Schweif 6 */}
          <div className="absolute w-2 h-2 flex items-center justify-center animate-trace-border-trail-6 pointer-events-none opacity-25">
            <div 
              className="w-1 h-1 rounded-full"
              style={{
                backgroundColor: flameColor,
                boxShadow: `0 0 5px 1.5px ${flameColor}`
              }}
            />
          </div>

          {/* Schweif 5 */}
          <div className="absolute w-2.5 h-2.5 flex items-center justify-center animate-trace-border-trail-5 pointer-events-none opacity-38">
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: flameColor,
                boxShadow: `0 0 6px 2px ${flameColor}`
              }}
            />
          </div>

          {/* Schweif 4: Mit Funkenbildung */}
          <div className="absolute w-2.5 h-2.5 flex items-center justify-center animate-trace-border-trail-4 pointer-events-none opacity-50">
            <div 
              className="w-2 h-2 rounded-full relative"
              style={{
                backgroundColor: flameColor,
                boxShadow: `0 0 7px 2px ${flameColor}`
              }}
            >
              <div
                className="absolute -bottom-1 -right-1 w-1 h-1 rounded-full bg-orange-300 pointer-events-none"
                style={{ animation: 'sparkFade1 0.9s ease-out infinite', animationDelay: '0.45s' }}
              />
            </div>
          </div>

          {/* Schweif 3 */}
          <div className="absolute w-3 h-3 flex items-center justify-center animate-trace-border-trail-3 pointer-events-none opacity-65">
            <div 
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: flameColor,
                boxShadow: `0 0 8px 2.5px ${flameColor}`
              }}
            />
          </div>

          {/* Schweif 2: Mit Funkenbildung */}
          <div className="absolute w-3 h-3 flex items-center justify-center animate-trace-border-trail-2 pointer-events-none opacity-80">
            <div 
              className="w-2.5 h-2.5 rounded-full relative"
              style={{
                backgroundColor: flameColor,
                boxShadow: `0 0 9px 3px ${flameColor}`
              }}
            >
              <div
                className="absolute -top-1 -right-1 w-1 h-1 rounded-full bg-amber-300 pointer-events-none"
                style={{ animation: 'sparkFade3 0.7s ease-out infinite', animationDelay: '0.15s' }}
              />
            </div>
          </div>

          {/* Schweif 1: Heißer Kernschweif direkt hinter dem Flammen-Glow */}
          <div className="absolute w-3.5 h-3.5 flex items-center justify-center animate-trace-border-trail-1 pointer-events-none opacity-92">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: flameColor,
                boxShadow: `0 0 10px 3.5px ${flameColor}`
              }}
            />
          </div>

          {/* Führender Flammen-Glow (reine farbige Flamme ohne weißen Kern) */}
          <div className="absolute w-4 h-4 flex items-center justify-center animate-trace-border pointer-events-none z-30">
            <div 
              className="w-2 h-2 rounded-full bg-transparent relative"
              style={{
                boxShadow: `0 0 14px 4px ${flameColor}, -6px -3px 18px 6px ${flameColor}bb, -12px -6px 22px 4px ${flameColor}66`,
              }}
            >
              {/* Kleine abfliegende Funken */}
              <div
                className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-200 pointer-events-none"
                style={{ animation: 'sparkFade1 0.8s ease-out infinite' }}
              />
              <div
                className="absolute -bottom-3 -left-2 w-1 h-1 rounded-full bg-orange-400 pointer-events-none"
                style={{ animation: 'sparkFade2 0.8s ease-out infinite', animationDelay: '0.25s' }}
              />
            </div>
          </div>
        </div>

        {/* Deckender innerer Container für den Text (z-10, sauber lesbar im Vordergrund) */}
        <span
          className={`relative z-10 w-full h-full rounded-[6px] ${
            vertical ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]' : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-800/80'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#06080f',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // SPEZIALFALL: Elektrischer Blitz (lightning)
  // Hochenergetischer Zickzack-Lichtbogen auf der Außenkante (vollständig OHNE rotierenden conic-gradient Schleier!)
  const isLightning = hasGlow && glowOption.patternId === 'lightning';

  if (isLightning) {
    const lightningColor = glowOption.colorHex || '#38bdf8';

    return (
      <span
        className={`relative ${
          vertical ? 'inline-flex flex-col items-center justify-center' : 'inline-flex items-center'
        } p-[2.5px] rounded-lg overflow-visible my-0.5 mx-0.5 ${className}`}
        style={{
          ...style
        }}
        title={tooltipText}
      >
        {/* Elektrische Entladungen & Zickzack-Lichtbogen auf der Außenkante */}
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-visible z-20">
          
          {/* Zufällige Knister-Lichtbögen (Spannungs-Entladungen an den Außenkanten) */}
          {/* Oben */}
          <div className="absolute -top-1 left-2 right-2 h-1 overflow-visible animate-zap-1 pointer-events-none opacity-0">
            <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="w-full h-2 overflow-visible">
              <polyline
                points="0,4 12,1 25,7 40,0 55,6 72,2 85,7 100,3"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${lightningColor}) drop-shadow(0 0 1px #ffffff)`
                }}
              />
            </svg>
          </div>

          {/* Unten */}
          <div className="absolute -bottom-1 left-3 right-3 h-1 overflow-visible animate-zap-2 pointer-events-none opacity-0">
            <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="w-full h-2 overflow-visible">
              <polyline
                points="0,3 15,7 30,1 45,6 60,1 75,7 90,2 100,4"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${lightningColor}) drop-shadow(0 0 1px #ffffff)`
                }}
              />
            </svg>
          </div>

          {/* Knisternder Schweif 4 (verblassendes Ende der elektrischen Entladung) */}
          <div className="absolute w-2 h-2 flex items-center justify-center animate-lightning-trail-4 pointer-events-none opacity-30">
            <div 
              className="w-1 h-1 rounded-sm rotate-45"
              style={{
                backgroundColor: lightningColor,
                boxShadow: `0 0 6px 1px ${lightningColor}`
              }}
            />
          </div>

          {/* Knisternder Schweif 3 */}
          <div className="absolute w-2 h-2 flex items-center justify-center animate-lightning-trail-3 pointer-events-none opacity-55">
            <div 
              className="w-1.5 h-1.5 rounded-sm rotate-12"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: `0 0 7px 2px ${lightningColor}`
              }}
            />
          </div>

          {/* Knisternder Schweif 2 */}
          <div className="absolute w-2.5 h-2.5 flex items-center justify-center animate-lightning-trail-2 pointer-events-none opacity-75">
            <div 
              className="w-2 h-2 rounded-sm -rotate-45"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: `0 0 9px 2.5px ${lightningColor}, 0 0 2px #ffffff`
              }}
            />
          </div>

          {/* Knisternder Schweif 1 (heißer Lichtbogen direkt hinter dem Kopf) */}
          <div className="absolute w-3 h-3 flex items-center justify-center animate-lightning-trail-1 pointer-events-none opacity-90">
            <div 
              className="w-2.5 h-2.5 rounded-sm rotate-45"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: `0 0 11px 3px ${lightningColor}, 0 0 3px #ffffff`
              }}
            />
          </div>

          {/* Führender elektrischer Blitz / Zickzack-Funke (hochfrequenter Zickzack-Lauf) */}
          <div className="absolute w-5 h-5 flex items-center justify-center animate-lightning-head pointer-events-none">
            <svg 
              viewBox="0 0 24 24" 
              className="w-4 h-4 text-white animate-pulse"
              style={{
                filter: `drop-shadow(0 0 8px ${lightningColor}) drop-shadow(0 0 14px ${lightningColor}) drop-shadow(0 0 2px #ffffff)`
              }}
              fill="currentColor"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>

        {/* Deckender innerer Container für den Text (z-10, absolut sauber lesbar auf schwarzem Hintergrund) */}
        <span
          className={`relative z-10 w-full h-full rounded-[6px] ${
            vertical ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]' : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-800/80'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#06080f',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // SPEZIALFALL: Schwapp-Welle (wave)
  // Organisch ausschwappende und zurückziehende Wasserwelle (KEIN Standard-Lauflicht!)
  const isWave = hasGlow && glowOption.patternId === 'wave';

  if (isWave) {
    const waveColor = glowOption.colorHex || '#06b6d4';

    return (
      <span
        className={`relative ${
          vertical ? 'inline-flex flex-col items-center justify-center' : 'inline-flex items-center'
        } p-[2.5px] rounded-lg overflow-visible my-0.5 mx-0.5 ${className}`}
        style={{
          ...style
        }}
        title={tooltipText}
      >
        {/* Nach außen schwappender, organischer Wellen-Layer */}
        <div className="absolute inset-0 rounded-lg pointer-events-none flex items-center justify-center overflow-visible z-0">
          
          {/* Wellen-Layer 1: Weicher, ausschwappender Wasserkörper */}
          <div 
            className="absolute -inset-1 animate-wave-splash-1 pointer-events-none"
            style={{
              backgroundColor: waveColor,
              filter: `blur(6px) drop-shadow(0 0 10px ${waveColor})`,
              boxShadow: `0 0 16px 2px ${waveColor}60`
            }}
          />

          {/* Wellen-Layer 2: Zeitversetzter sekundärer Wellenschlag für kontinuierliches Wogen */}
          <div 
            className="absolute -inset-1.5 animate-wave-splash-2 pointer-events-none"
            style={{
              backgroundColor: waveColor,
              filter: `blur(9px) drop-shadow(0 0 14px ${waveColor})`,
              boxShadow: `0 0 20px 4px ${waveColor}40`
            }}
          />

          {/* Wellenkamm (Crest): Organisch gewellte Kante, die nach außen bricht & verblasst */}
          <div 
            className="absolute -inset-0.5 animate-wave-crest pointer-events-none border-2"
            style={{
              borderColor: '#ffffff',
              boxShadow: `0 0 12px 2px ${waveColor}, inset 0 0 6px ${waveColor}80`,
              filter: `drop-shadow(0 0 4px ${waveColor})`
            }}
          />

          {/* Sanfte Grund-Aura an den Rändern */}
          <div 
            className="absolute inset-0 rounded-lg pointer-events-none opacity-40 blur-xs"
            style={{
              backgroundColor: waveColor
            }}
          />
        </div>

        {/* Deckender innerer Container für den Text (z-10, absolut sauber lesbar auf schwarzem Hintergrund) */}
        <span
          className={`relative z-10 w-full h-full rounded-[6px] ${
            vertical ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]' : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-800/80'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#06080f',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // SPEZIALFALL: Authentischer Industrie-Neonrahmen (Industrial Neon Border mit Doppel-Schlauch & Flimmern)
  const isIndustrialNeon = hasGlow && (
    glowOption.patternId === 'cyber' ||
    glowOption.patternId === 'double-border'
  );

  if (isIndustrialNeon) {
    const neonColor = glowOption.colorHex || '#06b6d4';

    return (
      <span
        className={`relative ${
          vertical ? 'inline-flex flex-col items-center justify-center p-0.5 my-3' : 'inline-flex items-center p-0.5 my-2.5'
        } rounded-xl overflow-visible mx-2 shadow-md ${className}`}
        style={{
          ['--neon-color' as any]: neonColor,
          ...style
        }}
        title={tooltipText}
      >
        {/* CSS für das industrielle Flimmern */}
        <style>{`
          @keyframes industrialFlicker {
            0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
              opacity: 0.95;
              filter: drop-shadow(0 0 6px ${neonColor});
            }
            20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
              opacity: 0.3;
              filter: drop-shadow(0 0 2px ${neonColor});
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
            border: `2px solid ${neonColor}`,
            boxShadow: `0 0 8px ${neonColor}, inset 0 0 4px ${neonColor}`,
          }}
        />

        {/* Innerer doppelter Neon-Schlauch (direkt am Rand) */}
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none animate-industrial-flicker z-20 opacity-85"
          style={{
            border: `1.5px solid ${neonColor}`,
            boxShadow: `0 0 5px ${neonColor}`,
          }}
        />

        {/* Gestochen scharfer, dunkler Kernbereich für optimale Lesbarkeit */}
        <span
          className={`relative z-10 w-full h-full rounded-md ${
            vertical
              ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]'
              : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-900'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#040711',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // SPEZIALFALL: Eiszapfen & rieselnde Schneeflocken (Snowfall Partikel-System)
  const isSnowFrame = hasGlow && (
    glowOption.patternId === 'snow-frame' ||
    (glowOption.patternId as string) === 'snow'
  );

  if (isSnowFrame) {
    const snowColor = glowOption.colorHex || '#38bdf8';

    // 9 dynamisch konfigurierte Schneeflocken
    const snowflakes = vertical
      ? Array.from({ length: 4 }).map((_, i) => ({
          id: i,
          left: `${12 + i * 26}%`,
          size: 10 + (i % 3) * 3,
          duration: 2.0 + (i % 3) * 0.7,
          delay: i * 0.35,
        }))
      : Array.from({ length: 9 }).map((_, i) => ({
          id: i,
          left: `${8 + i * 10}%`,
          size: 10 + (i % 3) * 4, // 10px, 14px, 18px
          duration: 2.0 + (i % 3) * 0.8,
          delay: i * 0.3,
        }));

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

    return (
      <span
        className={`relative ${
          vertical ? 'inline-flex flex-col items-center justify-center p-0.5 my-3.5' : 'inline-flex items-center p-0.5 my-3'
        } rounded-xl overflow-visible mx-2 shadow-md ${className}`}
        style={{
          ['--snow-color' as any]: snowColor,
          ...style
        }}
        title={tooltipText}
      >
        {/* Inline-CSS für die fließende Fall-Animation */}
        <style>{`
          @keyframes fallAndFade {
            0% {
              transform: translateY(-4px) rotate(0deg);
              opacity: 0;
            }
            20% {
              opacity: 1;
            }
            80% {
              opacity: 0.8;
            }
            100% {
              transform: translateY(38px) rotate(140deg);
              opacity: 0;
            }
          }
        `}</style>

        {/* Willkürliche, unterschiedlich lange Eiszapfen-Dreiecke mit sichtbarerem Glow */}
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
                filter: `drop-shadow(0 0 7px ${snowColor})`,
              }}
            />
          ))}
        </div>

        {/* Rieselnde Schneeflocken unterhalb des Namensschildes */}
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
                filter: `drop-shadow(0 0 5px ${snowColor})`,
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

        {/* Gestochen scharfer, normaler Darkmode-Kernbereich (ohne Glow oben/seitlich) */}
        <span
          className={`relative z-10 w-full h-full rounded-md ${
            vertical
              ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]'
              : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-800'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#040711',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // SPEZIALFALL: Rieselnder Matrix-Code (Matrix-Regen)
  const isMatrixFrame = hasGlow && (
    glowOption.patternId === 'matrix-frame' ||
    (glowOption.patternId as string) === 'matrix'
  );

  if (isMatrixFrame) {
    const matrixColor = glowOption.colorHex || '#22c55e';
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
      <span
        className={`relative ${
          vertical ? 'inline-flex flex-col items-center justify-center p-0.5 my-3.5' : 'inline-flex items-center p-0.5 my-3'
        } rounded-xl overflow-visible mx-2 shadow-md ${className}`}
        style={style}
        title={tooltipText}
      >
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

        {/* Rieselnder digitaler Matrix-Code unterhalb des Namensschildes */}
        <div className="absolute inset-x-0 top-full h-12 pointer-events-none overflow-visible z-40">
          {codeStreams.map((stream) => (
            <div
              key={stream.id}
              className="absolute font-mono font-bold select-none pointer-events-none"
              style={{
                left: stream.left,
                top: '2px',
                fontSize: `${stream.fontSize}px`,
                color: matrixColor,
                animation: `matrixRain ${stream.duration}s infinite linear`,
                animationDelay: `${stream.delay}s`,
                filter: `drop-shadow(0 0 5px ${matrixColor})`,
              }}
            >
              {stream.char}
            </div>
          ))}
        </div>

        {/* Gestochen scharfer, normaler Darkmode-Kernbereich (ohne Glow oben/seitlich) */}
        <span
          className={`relative z-10 w-full h-full rounded-md ${
            vertical
              ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]'
              : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-800'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#040711',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // SPEZIALFALL: Kanten-Tracing Rahmen (Laser)
  // Der Lichtstrahl / Effekt kreist exakt auf der Außenkante des Containers und wird
  // durch die inneren Deckfläche maskiert, sodass er NIEMALS den Text durchquert.
  const isBorderTracing = hasGlow && [
    'laser', 'laser-pulse'
  ].includes(glowOption.patternId);

  if (isBorderTracing) {
    const spinClass = 'animate-spin-laser';
    const borderGradient = `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, ${glowOption.colorHex} 325deg, #ffffff 360deg)`;
    const shadowColor = glowOption.colorHex;

    return (
      <span
        className={`relative p-[2.5px] rounded-lg overflow-hidden ${
          vertical ? 'inline-flex flex-col items-center justify-center' : 'inline-flex items-center'
        } my-0.5 mx-0.5 shadow-md ${className}`}
        style={{
          boxShadow: `0 0 12px ${shadowColor}60`,
          ...style
        }}
        title={tooltipText}
      >
        {/* Umlaufende Kanten-Animation (Border-Tracing) */}
        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none z-0">
          <div
            className={`absolute -inset-[180%] ${spinClass} pointer-events-none opacity-95`}
            style={{
              background: borderGradient
            }}
          />
        </div>

        {/* Innerer Container (Deckfläche, damit die Kanten-Animation nicht durch den Text läuft) */}
        <span
          className={`relative z-10 w-full h-full rounded-[6px] ${
            vertical ? 'px-1.5 py-1.5 flex flex-col items-center justify-center min-w-[24px]' : 'px-2.5 py-0.5 inline-flex items-center'
          } font-black tracking-wide shadow-xs ${
            hasBg
              ? bgOption.cssClasses
              : 'bg-black dark:bg-slate-950 text-white border border-slate-800'
          }`}
          style={{
            backgroundColor: hasBg ? (isSpecialBg ? undefined : bgOption.bgHex) : '#06080f',
            color: hasBg ? bgOption.textHex : undefined,
            ...(hasBg ? (bgOption.style || {}) : {})
          }}
        >
          {renderInnerContent()}
        </span>
      </span>
    );
  }

  // Standard-Fall: Nur Glow ohne farbigen Hintergrund
  if (!hasBg && hasGlow) {
    return (
      <span
        className={`${
          vertical
            ? 'inline-flex flex-col items-center justify-center px-1.5 py-1.5 min-w-[24px]'
            : 'inline-flex items-center px-2.5 py-0.5'
        } my-0.5 mx-0.5 rounded-lg font-black tracking-wide transition-all border-2 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-xs ${glowClass} ${className}`}
        style={{
          borderColor: glowOption.colorHex,
          ['--glow-color' as any]: glowOption.colorHex,
          ...style
        }}
        title={tooltipText}
      >
        {vertical ? (
          <span className="flex flex-col items-center justify-center leading-[0.95] select-none text-center font-black">
            {name.split('').map((char, i) => (
              <span key={i} className="block leading-[1.05] tracking-tight">
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </span>
        ) : (
          <span className="truncate">{name}</span>
        )}
      </span>
    );
  }

  // Standard-Fall: Mit farbigem Hintergrund (& evtl. zusätzlichem Neon-Glow / Einfachem Rahmen)
  return (
    <span
      className={`${
        vertical
          ? 'inline-flex flex-col items-center justify-center px-1.5 py-1.5 min-w-[24px]'
          : 'inline-flex items-center px-2.5 py-0.5'
      } ${hasGlow ? 'my-0.5 mx-0.5' : ''} rounded-lg font-black tracking-wide transition-all shadow-xs ${bgOption.cssClasses} ${glowClass} ${className}`}
      style={{
        backgroundColor: isSpecialBg ? undefined : bgOption.bgHex,
        color: bgOption.textHex,
        ...(bgOption.style || {}),
        ...(hasGlow ? { borderColor: glowOption.colorHex, ['--glow-color' as any]: glowOption.colorHex } : {}),
        ...style
      }}
      title={tooltipText}
    >
      {renderInnerContent()}
    </span>
  );
};

export default PlayerNameTag;
