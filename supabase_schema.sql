-- ==========================================
-- 1. TABELLE "profiles" ERSTELLEN
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  high_score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indizes für schnelle Abfragen erstellen
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) AKTIVIEREN & POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2.1 Lesezugriff: Angemeldete Benutzer können alle Profile einsehen (z.B. für Leaderboards oder Benutzernamen-Login)
CREATE POLICY "Profile für angemeldete Nutzer lesbar" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 2.2 Schreibzugriff (Insert): Benutzer können ihr eigenes Profil anlegen
CREATE POLICY "Eigenes Profil anlegen" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- 2.3 Schreibzugriff (Update): Benutzer können nur ihr eigenes Profil aktualisieren
CREATE POLICY "Eigenes Profil aktualisieren" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- 3. DATABASE TRIGGER ZUR AUTOMATISCHEN PROFIL-ERSTELLUNG
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, public.profiles.username);
  RETURN new;
END;
$$;

-- Trigger an die auth.users Tabelle binden
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 4. OPTIONALE DATABASE-FUNKTION (RPC) FÜR ATOMARE STATS-UPDATES
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_game_stats(
  p_user_id UUID,
  p_score INTEGER,
  p_is_win BOOLEAN
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  UPDATE public.profiles
  SET 
    games_played = games_played + 1,
    games_won = games_won + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    total_points = total_points + p_score,
    high_score = GREATEST(high_score, p_score)
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;
