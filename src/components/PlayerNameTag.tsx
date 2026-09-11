import React from 'react';
import { getNameTagOption } from '../constants/nameTagConfig';

interface PlayerNameTagProps {
  name: string;
  colorKey?: string | null;
  className?: string;
  style?: React.CSSProperties;
  asBadge?: boolean;
}

/**
 * PlayerNameTag:
 * Stellt den Spielernamen entweder standardmäßig oder mit dem freigeschalteten
 * farbigen Namenshintergrund (Rot, Blau, Grün, Gelb) dar.
 * Die Textfarbe wird automatisch für optimalen Kontrast angepasst (weiß bei rot/blau/grün, dunkel bei gelb).
 */
export const PlayerNameTag: React.FC<PlayerNameTagProps> = ({
  name,
  colorKey,
  className = '',
  style,
  asBadge = false
}) => {
  const option = getNameTagOption(colorKey);
  const hasBg = option.id !== 'none';

  if (!hasBg) {
    return (
      <span className={className} style={style}>
        {name}
      </span>
    );
  }

  // Mit farbigem Hintergrund & optimiertem Kontrast
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg font-black tracking-wide transition-all shadow-xs ${option.cssClasses} ${className}`}
      style={{
        backgroundColor: option.bgHex,
        color: option.textHex,
        borderColor: option.borderHex,
        ...style
      }}
      title={`Namenshintergrund: ${option.label}`}
    >
      <span className="truncate">{name}</span>
    </span>
  );
};

export default PlayerNameTag;
