import React from 'react';
import { DEFAULT_AVATAR_URL, handleAvatarError, getAvatarUrl } from '../supabaseClient';

export interface PlayerAvatarProps {
  /** Die URL des Profilbilds (null, undefined oder "" nutzt automatisch unknown.svg) */
  url?: string | null;
  /** Name des Spielers (für alt-Attribut und Fallback-Titel) */
  name?: string;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Optionale Rahmenfarbe oder Inline-Styles */
  style?: React.CSSProperties;
  /** Größe: Vordefiniert oder über className steuerbar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
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
 * - Nutzt automatisch DEFAULT_AVATAR_URL (unknown.svg aus Supabase Storage 'avatars'),
 *   falls kein Profilbild hinterlegt ist.
 * - Fängt 404- bzw. Ladefehler per onError ab und schaltet auf unknown.svg um.
 */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  url,
  name = 'Spieler',
  className = '',
  style,
  size = 'custom'
}) => {
  const finalSrc = getAvatarUrl(url);
  const sizeClass = size !== 'custom' ? sizeClassesMap[size] : '';

  return (
    <img
      src={finalSrc}
      alt={name ? `Profilbild von ${name}` : 'Profilbild'}
      onError={handleAvatarError}
      className={`rounded-full object-cover select-none shrink-0 ${sizeClass} ${className}`}
      style={style}
      loading="lazy"
    />
  );
};

export default PlayerAvatar;
