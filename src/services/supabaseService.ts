import { supabase } from '../supabaseClient';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  games_played: number;
  games_won: number;
  high_score: number;
  total_points: number;
  created_at: string;
}

/**
 * Meldet den Benutzer mit E-Mail ODER Benutzernamen an.
 */
export async function signInWithEmailOrUsername(identifier: string, password: string) {
  let emailToUse = identifier.trim();

  // Falls kein '@' enthalten ist, wird der E-Mail-Wert aus der `profiles`-Tabelle gesucht
  if (!emailToUse.includes('@')) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .ilike('username', emailToUse)
      .maybeSingle();

    if (profileError || !profile || !profile.email) {
      throw new Error('Kein Benutzer mit diesem Benutzernamen gefunden.');
    }

    emailToUse = profile.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (error) {
    throw new Error(error.message || 'Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.');
  }

  return data;
}

/**
 * Registriert einen neuen Benutzer und legt ein Profil an.
 */
export async function signUpUser(email: string, password: string, username: string) {
  const cleanUsername = username.trim();
  const cleanEmail = email.trim();

  // Prüfen, ob der Benutzername bereits vergeben ist
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', cleanUsername)
    .maybeSingle();

  if (existingUser) {
    throw new Error('Dieser Benutzername ist bereits vergeben.');
  }

  // Registrierung bei Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        username: cleanUsername,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    // Falls kein DB-Trigger aktiv ist, erstellen wir das Profil explizit im Frontend
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          username: cleanUsername,
          email: cleanEmail,
          games_played: 0,
          games_won: 0,
          high_score: 0,
          total_points: 0,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.warn('Profil-Erstellung im Frontend fehlgeschlagen/redundant:', profileError.message);
    }
  }

  return data;
}

/**
 * Ruft das Profil des aktuell angemeldeten oder angegebenen Nutzers ab.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) {
    console.warn('getUserProfile: Keine userId übergeben.');
    return null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Fehler beim Abrufen des Profils:', error);
    return null;
  }

  return data as UserProfile;
}

/**
 * Aktualisiert die Spielstatistiken nach einem Spielabschluss.
 */
export async function updateGameStats(userId: string, score: number, isWin: boolean): Promise<UserProfile> {
  // 1. Aktuelles Profil holen
  const currentProfile = await getUserProfile(userId);

  if (!currentProfile) {
    throw new Error('Profil nicht gefunden. Spielstatistiken konnten nicht aktualisiert werden.');
  }

  // 2. Werte berechnen
  const newGamesPlayed = (currentProfile.games_played || 0) + 1;
  const newGamesWon = (currentProfile.games_won || 0) + (isWin ? 1 : 0);
  const newTotalPoints = (currentProfile.total_points || 0) + score;
  const newHighScore = Math.max(currentProfile.high_score || 0, score);

  // 3. Profil in Supabase aktualisieren
  const { data, error } = await supabase
    .from('profiles')
    .update({
      games_played: newGamesPlayed,
      games_won: newGamesWon,
      total_points: newTotalPoints,
      high_score: newHighScore,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Fehler beim Aktualisieren der Spielstatistiken: ${error.message}`);
  }

  return data as UserProfile;
}
