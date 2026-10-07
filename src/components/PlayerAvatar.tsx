import React from 'react';
import { DEFAULT_AVATAR_URL, handleAvatarError, getAvatarUrl } from '../supabaseClient';
import { getAvatarFrameClass } from '../constants/cosmeticsConfig';

export interface PlayerAvatarProps {
  /** Die URL des Profilbilds (null, undefined oder "" nutzt automatisch unknown.svg) */
  url?: string | null;
  /** Zusätzlicher Parameter / Alias für avatar_url */
  avatar_url?: string | null;
  /** Name des Spielers (für alt-Attribut und Fallback-Titel) */
  name?: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Optionale Rahmenfarbe oder Inline-Styles */
  style?: React.CSSProperties;
  /** Größe: Vordefiniert oder über className steuerbar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  /** Freigeschalteter Kosmetik-Rahmen (z. B. oak_wood, neon_purple_glow, aurora_glow, etc.) */
  avatar_frame?: string | null;
  avatarFrame?: string | null;
  frame?: string | null;
}

const sizeClassesMap = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-20 h-20',
  custom: '',
};

/**
 * Universelle Avatar-Komponente für alle Spieler & Accounts.
 * - Rendert ein <img>-Element mit der übergebenen avatar_url / url.
 * - Nutzt automatisch DEFAULT_AVATAR_URL (unknown.svg aus Supabase Storage 'avatars'),
 *   falls kein Profilbild hinterlegt ist.
 * - Fängt 404- bzw. Ladefehler per onError ab und schaltet auf unknown.svg um.
 * - Unterstützt freigeschaltete Avatar-Rahmen (Level 5-20 Belohnungen).
 */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  url,
  avatar_url,
  name = 'Spieler',
  className = '',
  style,
  size = 'custom',
  avatar_frame,
  avatarFrame,
  frame
}) => {
  const targetUrl = (avatar_url !== undefined && avatar_url !== null) ? avatar_url : url;
  const finalSrc = getAvatarUrl(targetUrl);
  const sizeClass = size !== 'custom' ? sizeClassesMap[size] : '';
  const effectiveFrame = avatar_frame || avatarFrame || frame;
  const frameClass = getAvatarFrameClass(effectiveFrame);

  return (
    <img
      src={finalSrc}
      alt={name ? `Profilbild von ${name}` : 'Profilbild'}
      onError={handleAvatarError}
      className={`rounded-full object-cover select-none shrink-0 ${sizeClass} ${frameClass} ${className}`}
      style={style}
      loading="lazy"
    />
  );
};

export default PlayerAvatar;
