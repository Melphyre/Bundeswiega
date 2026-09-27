/**
 * Wiegschaften Level- & Cosmetics-System
 * 
 * Mathematische Formeln:
 * - Gesamt-XP = Summe der Mitglieder-XP
 * - Effektive XP = Gesamt-XP * (1 + 0.1 * ln(Mitgliederanzahl))
 * - Level = floor((Effektive XP / 150)^(2/3)) + 1
 * - Benötigte XP für Level L = floor(150 * L^1.5)
 */

export interface GuildCosmetics {
  level: number;
  guildTitle: string;
  logoBorder: string;
  tagClass: string;
  rowClass: string;
  unlockedPerks: {
    canChangeLogo: boolean;
    woodBorder: boolean;
    canCustomTitle: boolean;
    bronzeRowAura: boolean;
    canCustomTagColor: boolean;
    silverRowEdge: boolean;
    goldMassiv: boolean;
    goldRowShimmer: boolean;
    goldWings: boolean;
    rubyCrystal: boolean;
    diamondHolo: boolean;
    laurelGod: boolean;
  };
}

export interface GuildLevelInfo {
  level: number;
  xp: number;
  rawXP: number;
  currentLevelProgressXP: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  cosmetics: GuildCosmetics;
}

export interface LevelRewardMilestone {
  level: number;
  title: string;
  rewardType: 'title' | 'border' | 'tag' | 'row' | 'perk';
  rewardName: string;
  description: string;
  icon: string;
  previewClass?: string;
}

/**
 * Berechnet das Wiegschafts-Level und XP basierend auf den Mitgliedern
 */
export function calculateGuildLevelAndXP(members: Array<{ xp?: number }>): GuildLevelInfo {
  const safeMembers = Array.isArray(members) ? members : [];
  const rawXP = safeMembers.reduce((sum, m) => sum + Math.max(0, Number(m?.xp) || 0), 0);
  
  // Teambuilding-Bonus durch Mitgliederanzahl
  const memberCount = Math.max(1, safeMembers.length);
  const scalingBonus = 1 + 0.1 * Math.log(memberCount);
  const effectiveXP = Math.round(rawXP * scalingBonus);

  // Level-Formel: Level = floor((Effektive XP / 150)^(2/3)) + 1
  const calculatedLevel = Math.floor(Math.pow(effectiveXP / 150, 2 / 3)) + 1;
  const level = Math.max(1, Math.min(50, calculatedLevel));

  // Schwellen-Berechnung:
  // Basis-XP für das aktuelle Level:
  const currentLevelBaseXP = level === 1 ? 0 : Math.floor(150 * Math.pow(level - 1, 1.5));
  // Ziel-XP für das nächste Level:
  const nextLevelTargetXP = Math.floor(150 * Math.pow(level, 1.5));

  const currentLevelProgressXP = Math.max(0, effectiveXP - currentLevelBaseXP);
  const xpNeededForNextLevel = Math.max(1, nextLevelTargetXP - currentLevelBaseXP);
  
  const progressPercent = level >= 50
    ? 100
    : Math.min(100, Math.max(0, Math.round((currentLevelProgressXP / xpNeededForNextLevel) * 100)));

  const cosmetics = getGuildCosmetics(level);

  return {
    level,
    xp: effectiveXP,
    rawXP,
    currentLevelProgressXP,
    xpNeededForNextLevel,
    progressPercent,
    cosmetics
  };
}

/**
 * Liefert die Styling-Klassen & Cosmetics für das jeweilige Wiegschafts-Level
 */
export function getGuildCosmetics(level: number): GuildCosmetics {
  const safeLevel = Math.max(1, Math.min(50, Number(level) || 1));

  // 1. Guild Titel
  let guildTitle = 'Neuling-Wiegschaft';
  if (safeLevel >= 50) guildTitle = '⚡ Wiegschaft der Urväter';
  else if (safeLevel >= 40) guildTitle = '💎 Diamantener Zirkel';
  else if (safeLevel >= 35) guildTitle = '🔥 Unbeugsame Zecher';
  else if (safeLevel >= 30) guildTitle = '🍺 Legenden des Tresens';
  else if (safeLevel >= 25) guildTitle = '👑 Schenken-Könige';
  else if (safeLevel >= 20) guildTitle = '🥇 Goldener Wiegeclub';
  else if (safeLevel >= 15) guildTitle = '⚔️ Trinkfestes Bündnis';
  else if (safeLevel >= 10) guildTitle = '🥈 Silberne Wieggilde';
  else if (safeLevel >= 5) guildTitle = '🥉 Etablierte Zunft';

  // 2. Logo-Rahmen (logoBorder)
  let logoBorder = 'border-none';
  if (safeLevel >= 50) logoBorder = 'border-laurel-gold';
  else if (safeLevel >= 40) logoBorder = 'border-diamond-holo';
  else if (safeLevel >= 35) logoBorder = 'border-ruby-crystal';
  else if (safeLevel >= 30) logoBorder = 'border-gold-wings';
  else if (safeLevel >= 20) logoBorder = 'border-gold-massiv';
  else if (safeLevel >= 10) logoBorder = 'border-silver';
  else if (safeLevel >= 5) logoBorder = 'border-bronze';
  else if (safeLevel >= 3) logoBorder = 'border-wood';

  // 3. Tag-Klassen (tagClass)
  let tagClass = 'tag-default';
  if (safeLevel >= 50) tagClass = 'tag-prismatic-god';
  else if (safeLevel >= 40) tagClass = 'tag-diamond-holo';
  else if (safeLevel >= 35) tagClass = 'tag-fire-gradient';
  else if (safeLevel >= 30) tagClass = 'tag-amber-flame';
  else if (safeLevel >= 20) tagClass = 'tag-gold-pulse';
  else if (safeLevel >= 10) tagClass = 'tag-silver-shimmer';
  else if (safeLevel >= 5) tagClass = 'tag-bronze';

  // 4. Tabellenzeilen-Aura (rowClass)
  let rowClass = 'row-default';
  if (safeLevel >= 50) rowClass = 'row-godly-aura';
  else if (safeLevel >= 40) rowClass = 'row-obsidian-bg';
  else if (safeLevel >= 25) rowClass = 'row-gold-shimmer';
  else if (safeLevel >= 15) rowClass = 'row-silver-edge';
  else if (safeLevel >= 7) rowClass = 'row-bronze-hover';

  return {
    level: safeLevel,
    guildTitle,
    logoBorder,
    tagClass,
    rowClass,
    unlockedPerks: {
      canChangeLogo: safeLevel >= 1,
      woodBorder: safeLevel >= 3,
      canCustomTitle: safeLevel >= 5,
      bronzeRowAura: safeLevel >= 7,
      canCustomTagColor: safeLevel >= 10,
      silverRowEdge: safeLevel >= 15,
      goldMassiv: safeLevel >= 20,
      goldRowShimmer: safeLevel >= 25,
      goldWings: safeLevel >= 30,
      rubyCrystal: safeLevel >= 35,
      diamondHolo: safeLevel >= 40,
      laurelGod: safeLevel >= 50
    }
  };
}

/**
 * Vollständige Belohnungs-Leiter für das Modal "Level-Belohnungen" (Level 1 bis 50)
 */
export const GUILD_LEVEL_REWARDS: LevelRewardMilestone[] = [
  {
    level: 1,
    title: 'Neuling-Wiegschaft',
    rewardType: 'perk',
    rewardName: 'Wiegschaftsgründung & Logo-Wahl',
    description: 'Freischaltung von Logo-Upload, Wappen-Vorlagen und Mitglieder-Einladungen.',
    icon: '🏰'
  },
  {
    level: 2,
    title: 'Anfänger-Bündnis',
    rewardType: 'tag',
    rewardName: 'Bronze-Tag-Hintergrund',
    description: 'Schaltet den matten Bronze-Hintergrund für euren Wiegschafts-Tag [TAG] frei.',
    icon: '🤎',
    previewClass: 'tag-bronze'
  },
  {
    level: 3,
    title: 'Aufstrebendes Holz',
    rewardType: 'border',
    rewardName: 'Holz-Rahmen (Wood)',
    description: 'Ein rustikaler Holzrahmen schmückt das Wappen deiner Wiegschaft.',
    icon: '🪵',
    previewClass: 'border-wood'
  },
  {
    level: 4,
    title: 'Stammlokal-Gilde',
    rewardType: 'perk',
    rewardName: 'Bierkrug-Emblem',
    description: 'Freischaltung des kleinen Bierkrug-Symbols 🍺 als Markierung im Profil.',
    icon: '🍺'
  },
  {
    level: 5,
    title: '🥉 Etablierte Zunft',
    rewardType: 'perk',
    rewardName: 'Bronze-Wappen & Custom-Titel',
    description: 'Kapitän & Vize können nun eigene Wiegschafts-Titel vergeben. Bronze-Tag & Rahmen freigeschaltet.',
    icon: '🥉',
    previewClass: 'border-bronze tag-bronze'
  },
  {
    level: 6,
    title: 'Waldgrüne Runde',
    rewardType: 'tag',
    rewardName: 'Waldgrün-Tag Theme',
    description: 'Neue frische Tag-Farbe: Waldgrün (#2F855A) für euren Wiegschafts-Tag.',
    icon: '🌲'
  },
  {
    level: 7,
    title: 'Bronzener Ruhm',
    rewardType: 'row',
    rewardName: 'Bronze Zeilen-Aura',
    description: 'In der Championswiegtabelle hebt sich deine Wiegschaft mit einem edlen Bronze-Hover ab.',
    icon: '✨',
    previewClass: 'row-bronze-hover'
  },
  {
    level: 8,
    title: 'Ozean-Gilde',
    rewardType: 'tag',
    rewardName: 'Ozeanblau-Tag Theme',
    description: 'Tiefe blaue Akzente (#2B6CB0) für euren Wiegschafts-Tag.',
    icon: '🌊'
  },
  {
    level: 9,
    title: 'Gesellige Runde',
    rewardType: 'title',
    rewardName: 'Titel: Gesellige Runde',
    description: 'Freischaltung des exklusiven Wiegschafts-Titels 🍻 Gesellige Runde.',
    icon: '🍻'
  },
  {
    level: 10,
    title: '🥈 Silberne Wieggilde',
    rewardType: 'perk',
    rewardName: 'Silber-Rahmen & Tag-Farbanpassung',
    description: 'Silberner Shimmer-Tag, Silber-Rahmen und Freischaltung des Tag-Farbwählers für Kapitäne.',
    icon: '🥈',
    previewClass: 'border-silver tag-silver-shimmer'
  },
  {
    level: 11,
    title: 'Königlicher Stammtisch',
    rewardType: 'tag',
    rewardName: 'Königsviolett-Tag Theme',
    description: 'Königliches Violett (#6B46C1) für ein majestätisches Tag-Design.',
    icon: '🔮'
  },
  {
    level: 12,
    title: 'Neon-Zunft',
    rewardType: 'tag',
    rewardName: 'Neon-Saufgrün Tag',
    description: 'Gefährlich leuchtendes Neon-Grün (#38A169) für euren Auftritt.',
    icon: '🧪'
  },
  {
    level: 13,
    title: 'Keller-Meister',
    rewardType: 'perk',
    rewardName: 'Weinfass-Emblem',
    description: 'Elegantes Fass-Icon 🛢️ neben eurem Wiegschaftsnamen.',
    icon: '🛢️'
  },
  {
    level: 14,
    title: 'Schattierte Gilde',
    rewardType: 'perk',
    rewardName: 'Schatten-Schrift-Effekt',
    description: 'Dezenter Schlagschatten hinter den Buchstaben eures Wiegschaftsnamens.',
    icon: '🔤'
  },
  {
    level: 15,
    title: '⚔️ Trinkfestes Bündnis',
    rewardType: 'row',
    rewardName: 'Silberne Zeilen-Kante',
    description: 'Ein schimmernder Silberrand an der linken Tabellenzeile im Leaderboard.',
    icon: '⚔️',
    previewClass: 'row-silver-edge'
  },
  {
    level: 16,
    title: 'Flammen-Bruderschaft',
    rewardType: 'tag',
    rewardName: 'Flammenorange-Tag Theme',
    description: 'Feuriges Orange (#DD6B20) als dynamischer Farbakzent.',
    icon: '🔥'
  },
  {
    level: 17,
    title: 'Kneipen-Kastell',
    rewardType: 'title',
    rewardName: 'Titel: Kneipen-Kastell',
    description: 'Freischaltung des Wiegschafts-Titels 🏰 Kneipen-Kastell.',
    icon: '🏰'
  },
  {
    level: 18,
    title: 'Silberne Reflexion',
    rewardType: 'border',
    rewardName: 'Pulsierender Silber-Glow',
    description: 'Der Silberrahmen eures Logos pulsiert sanft bei Interaktionen im Profil.',
    icon: '💫',
    previewClass: 'border-silver'
  },
  {
    level: 19,
    title: 'Nachtschatten-Zirkel',
    rewardType: 'tag',
    rewardName: 'Mitternachtsblau-Tag Theme',
    description: 'Dunkles Mitternachtsblau (#1A365D) als elegante Tag-Farbe.',
    icon: '🌌'
  },
  {
    level: 20,
    title: '🥇 Goldener Wiegeclub',
    rewardType: 'border',
    rewardName: 'Massiver Gold-Rahmen & Puls-Tag',
    description: 'Tiefes Goldleuchten für das Wappen und intensiv pulsierendes Tag mit Mobile-Neon-Glow.',
    icon: '🥇',
    previewClass: 'border-gold-massiv tag-gold-pulse'
  },
  {
    level: 21,
    title: 'Rosegold-Elite',
    rewardType: 'tag',
    rewardName: 'Rosegold-Tag Theme',
    description: 'Edles Rosegold (#B76E79) verleiht eurem Tag einen luxuriösen Touch.',
    icon: '🌸'
  },
  {
    level: 22,
    title: 'Anstoß-Zunft',
    rewardType: 'perk',
    rewardName: 'Anstoßende Krüge Emblem',
    description: 'Freischaltung von 🥂 als offizielles Namens-Präfix.',
    icon: '🥂'
  },
  {
    level: 23,
    title: 'Cyan-Allianz',
    rewardType: 'tag',
    rewardName: 'Cyangrün-Tag Theme',
    description: 'Frisches Cyan-Grün (#319795) für maximale Aufmerksamkeit.',
    icon: '💎'
  },
  {
    level: 24,
    title: 'Tresen-Garde',
    rewardType: 'title',
    rewardName: 'Titel: Hüter des Tresens',
    description: 'Freischaltung des ehrenwerten Titels 🛡️ Hüter des Tresens.',
    icon: '🛡️'
  },
  {
    level: 25,
    title: '👑 Schenken-Könige',
    rewardType: 'row',
    rewardName: 'Goldener Zeilen-Schimmer',
    description: 'Elegantes Goldleuchten über der gesamten Tabellenzeile in der Championswiegtabelle.',
    icon: '👑',
    previewClass: 'row-gold-shimmer'
  },
  {
    level: 26,
    title: 'Electric-Runde',
    rewardType: 'tag',
    rewardName: 'Electric Purple Tag',
    description: 'Intensiv leuchtendes Violett (#805AD5) mit starkem Glow.',
    icon: '⚡'
  },
  {
    level: 27,
    title: 'Vergoldeter Rang',
    rewardType: 'perk',
    rewardName: 'Vergoldetes Rang-Schild',
    description: 'Eure Tabellen-Platzierung (#1, #2...) erstrahlt in der Championswieg in Gold.',
    icon: '🥇'
  },
  {
    level: 28,
    title: 'Festival-Könige',
    rewardType: 'title',
    rewardName: 'Titel: Festival-Meister',
    description: 'Freischaltung des Wiegschafts-Titels 🎪 Festival-Meister.',
    icon: '🎪'
  },
  {
    level: 29,
    title: 'Smaragd-Zirkel',
    rewardType: 'tag',
    rewardName: 'Smaragdgrün-Tag Theme',
    description: 'Deep Emerald Green (#22543D) für euren Wiegschafts-Tag.',
    icon: '🟢'
  },
  {
    level: 30,
    title: '🍺 Legenden des Tresens',
    rewardType: 'border',
    rewardName: 'Goldene Flügel & Bernstein-Tag',
    description: 'Extravaganter Goldflügel-Rahmen und Bernstein-Flammen-Tag mit extremem Glow.',
    icon: '🍺',
    previewClass: 'border-gold-wings tag-amber-flame'
  },
  {
    level: 31,
    title: 'Magenta-Licht',
    rewardType: 'tag',
    rewardName: 'Magenta-Glow Tag',
    description: 'Satt leuchtendes Magenta (#D53F8C) für euren Tag.',
    icon: '🌺'
  },
  {
    level: 32,
    title: 'Trophäen-Träger',
    rewardType: 'perk',
    rewardName: 'Goldener Pokal Emblem',
    description: 'Zeigt eine goldene Trophäe 🏆 dauerhaft neben eurem Namen.',
    icon: '🏆'
  },
  {
    level: 33,
    title: 'Vergoldetes Wort',
    rewardType: 'perk',
    rewardName: 'Goldene Tag-Schrift',
    description: 'Vergoldete Schriftart direkt auf eurem Wiegschafts-Tag.',
    icon: '✏️'
  },
  {
    level: 34,
    title: 'Kulturgut-Runde',
    rewardType: 'title',
    rewardName: 'Titel: Kulturgut der Runde',
    description: 'Freischaltung des nostalgischen Titels 📜 Kulturgut der Runde.',
    icon: '📜'
  },
  {
    level: 35,
    title: '🔥 Unbeugsame Zecher',
    rewardType: 'border',
    rewardName: 'Rubin-Kristall & Feuer-Gradient',
    description: 'Feurig-roter Kristallglanz und animierter Flammen-Gradient für das Tag.',
    icon: '🔥',
    previewClass: 'border-ruby-crystal tag-fire-gradient'
  },
  {
    level: 36,
    title: 'Toxic-Gilde',
    rewardType: 'tag',
    rewardName: 'Toxic-Green Tag',
    description: 'Giftgrünes High-Vis Leuchten (#00FF66) für maximale Sichtbarkeit.',
    icon: '☣️'
  },
  {
    level: 37,
    title: 'Aura-Platzierung',
    rewardType: 'perk',
    rewardName: 'Pulsierender Rang-Schein',
    description: 'Ein magischer Lichtschein pulsiert hinter eurer Rang-Nummer in der Tabelle.',
    icon: '🌟'
  },
  {
    level: 38,
    title: 'Unaufhaltsame Macht',
    rewardType: 'title',
    rewardName: 'Titel: Unaufhaltsame Kraft',
    description: 'Freischaltung des powervollen Titels 🌋 Unaufhaltsame Kraft.',
    icon: '🌋'
  },
  {
    level: 39,
    title: 'Phönix-Bündnis',
    rewardType: 'perk',
    rewardName: 'Phönix-Emblem',
    description: 'Ein flammendes Phönix-Symbol 🦅 ziert euer Wiegschafts-Profil.',
    icon: '🦅'
  },
  {
    level: 40,
    title: '💎 Diamantener Zirkel',
    rewardType: 'row',
    rewardName: 'Obsidian-Hintergrund & Diamant-Holo',
    description: 'Dunkler Obsidian-Aura-Look und holografischer Diamant-Rahmen mit Cyan/Violett-Schein.',
    icon: '💎',
    previewClass: 'border-diamond-holo tag-diamond-holo row-obsidian-bg'
  },
  {
    level: 41,
    title: 'Plasma-Allianz',
    rewardType: 'tag',
    rewardName: 'Plasma-Pink Tag',
    description: 'Extrem intensives Plasma-Pink (#FF007F) für euren Tag.',
    icon: '💖'
  },
  {
    level: 42,
    title: 'Kristall-Funkeln',
    rewardType: 'border',
    rewardName: 'Diamant-Partikel',
    description: 'Animierte Diamant-Partikel beim Hovern über euer Wiegschafts-Logo.',
    icon: '✨',
    previewClass: 'border-diamond-holo'
  },
  {
    level: 43,
    title: 'Unsterbliche Zunft',
    rewardType: 'title',
    rewardName: 'Titel: Halle der Unsterblichen',
    description: 'Freischaltung des mythischen Titels 🏛️ Halle der Unsterblichen.',
    icon: '🏛️'
  },
  {
    level: 44,
    title: 'Kosmos-Zirkel',
    rewardType: 'tag',
    rewardName: 'Cosmic-Blue Tag',
    description: 'Tief leuchtendes Kosmos-Blau (#00D4FF) freigeschaltet.',
    icon: '🌌'
  },
  {
    level: 45,
    title: 'Regenbogen-Aura',
    rewardType: 'perk',
    rewardName: 'Regenbogen-Hover-Effekt',
    description: 'Farbwechselnder Regenbogen-Effekt beim Mouseover über eure Wiegschaft.',
    icon: '🌈'
  },
  {
    level: 46,
    title: 'Magischer Stammtisch',
    rewardType: 'title',
    rewardName: 'Titel: Magischer Stammtisch',
    description: 'Freischaltung des geheimnisvollen Titels 🔮 Magischer Stammtisch.',
    icon: '🔮'
  },
  {
    level: 47,
    title: 'Blitz-Bündnis',
    rewardType: 'perk',
    rewardName: 'Blitze-Symbol',
    description: 'Elektrisierendes Blitz-Icon ⚡ direkt neben eurem Wiegschafts-Tag.',
    icon: '⚡'
  },
  {
    level: 48,
    title: 'Goldene Zeilenaura',
    rewardType: 'row',
    rewardName: 'Dauerhafter Gold-Aura Rand',
    description: 'Die gesamte Tabellenzeile wird von einem dauerhaft leuchtenden Goldrand umschlossen.',
    icon: '🟡',
    previewClass: 'row-gold-shimmer'
  },
  {
    level: 49,
    title: 'Kosmische Trinker',
    rewardType: 'title',
    rewardName: 'Titel: Kosmische Trinker',
    description: 'Freischaltung des exklusiven Endgame-Titels 🌌 Kosmische Trinker.',
    icon: '🌌'
  },
  {
    level: 50,
    title: '⚡ Wiegschaft der Urväter',
    rewardType: 'perk',
    rewardName: 'Göttliche Aura & Lorbeer-Gold',
    description: 'Höchste Ehrung: Goldener Lorbeerkranz, prismatisches Rainbow-Tag und göttliche Aura.',
    icon: '⚡',
    previewClass: 'border-laurel-gold tag-prismatic-god row-godly-aura'
  }
];