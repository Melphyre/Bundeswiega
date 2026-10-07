export type WorldOfWiegenPool = 'kreiswiega' | 'championswieg';

export type QuestCategory = 'precision' | 'comeback' | 'leader' | 'consistency' | 'social';

export type QuestId =
  | 'better_than_x'
  | 'over_under_target'
  | 'opposite_to_x'
  | 'parallel_to_x'
  | 'drop_lantern'
  | 'climb_rank'
  | 'defend_lead'
  | 'catch_leader'
  | 'no_schnaps'
  | 'schnapszahl'
  | 'bullseye'
  | 'improver'
  | 'no_schnaps_when_x'
  | 'same_weight'
  | 'even_only'
  | 'odd_only'
  | 'target_end_digit';

export interface QuestDefinition {
  id: QuestId;
  name: string;
  shortTitle: string;
  description: string;
  epicLore: string;
  category: QuestCategory;
  durationRounds: number;
  pool: 'kreiswiega' | 'championswieg' | 'both';
  icon: string;
  difficulty: 'normal' | 'hard' | 'extreme';
  // Dynamic Skill & Leaderboard Gating conditions:
  maxPreAverage?: number; // e.g. < 7.0 for strong precision players
  minPreAverage?: number; // for struggling players
  requiresRankMin?: number; // e.g. rank >= 3 for comeback
  requiresLeader?: boolean; // must be 1st
  requiresTail?: boolean; // must be last
  requiresMinPlayers?: number;
}

export interface ActiveQuest {
  id: string; // Unique instance id
  questId: QuestId;
  playerId: string;
  playerName: string;
  pool: WorldOfWiegenPool; // 'kreiswiega' | 'championswieg' - individually chosen per quest!
  targetPlayerId?: string;
  targetPlayerName?: string;
  assignedRound: number; // e.g. round 2
  targetRound: number; // e.g. round 5
  initialRank: number;
  initialPreAverage: number;
  targetValue?: number; // e.g. target end digit, or side
  streakCount: number;
  requiredStreak: number;
  tolerance?: number;
  customDescription?: string;
  progressText: string;
  status: 'active' | 'completed' | 'failed';
  completedRound?: number;
  rewardEffectId?: string;
}

export type EffectCode =
  | 'E01'
  | 'E02'
  | 'E03'
  | 'E04'
  | 'E05'
  | 'E06'
  | 'E07'
  | 'E08'
  | 'E09'
  | 'E10'
  | 'E11'
  | 'E12'
  | 'E13';

export type EffectDuration = 'next_round' | 'rest_of_game' | 'instant_minigame' | 'final_round' | 'once';

export interface EffectDefinition {
  id: EffectCode;
  code: EffectCode;
  name: string;
  subtitle: string;
  description: string;
  flavorText: string;
  duration: EffectDuration;
  durationLabel: string;
  pool: 'kreiswiega' | 'championswieg' | 'both';
  isAsymmetric: boolean;
  icon: string;
  isMinigame?: boolean;
}

export interface ActiveEffect {
  id: string; // instance id
  effectId: EffectCode;
  name: string;
  description: string;
  icon: string;
  activatedRound: number;
  expiresRound?: number; // undefined if rest_of_game
  triggeredByPlayerId: string;
  triggeredByPlayerName: string;
  targetPlayerIds?: string[];
  targetPlayerNames?: string[];
  drinkBuddyPairs?: Array<{ playerA: string; playerB: string }>;
  ritualDescription?: string;
  extraData?: Record<string, any>;
}

export interface WorldOfWiegenState {
  enabled: boolean;
  pool: WorldOfWiegenPool;
  activeQuests: ActiveQuest[];
  questHistory: ActiveQuest[];
  activeEffects: ActiveEffect[];
  effectHistory: ActiveEffect[];
  pendingQuestModal?: ActiveQuest | null;
  pendingEffectModal?: {
    quest: ActiveQuest;
    effect: EffectDefinition;
    activeEffect: ActiveEffect;
  } | null;
}
