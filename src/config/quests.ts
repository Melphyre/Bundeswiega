export interface QuestDefinition {
  id: string;
  level: number;
  title: string;
  xpReward: number;
  titleReward?: string;
  metric: 'profile_pic' | 'games_count' | 'avg_less_than' | 'total_less_than' | 'max_schnaepse';
  targetValue: number;
  gameMode?: string;
  threshold?: number;
  targetCount?: number;
}

export const LEVEL_QUESTS: QuestDefinition[] = [
  // --- LEVEL 1 ---
  { id: 'l1_profile_pic', level: 1, title: 'Lege ein Profilbild an', xpReward: 5, metric: 'profile_pic', targetValue: 1, targetCount: 1 },
  { id: 'l1_5_standard', level: 1, title: 'Spiele 5 Standardspiele', xpReward: 5, metric: 'games_count', targetValue: 5, targetCount: 5, gameMode: 'Standardspiel' },
  { id: 'l1_avg_sub5', level: 1, title: 'Erreiche einen Durchschnitt von < 5 Gramm', xpReward: 5, metric: 'avg_less_than', targetValue: 5.0, threshold: 5.0, targetCount: 1 },
  { id: 'l1_total_sub6', level: 1, title: 'Erreiche ein Total von < 6 Gramm', xpReward: 5, metric: 'total_less_than', targetValue: 6.0, threshold: 6.0, targetCount: 1 },
  { id: 'l1_avg_sub25', level: 1, title: 'In einem Spiel einen Durchschnitt unter 2,5 Gramm', xpReward: 5, titleReward: 'Scharfschütze', metric: 'avg_less_than', targetValue: 2.5, threshold: 2.5, targetCount: 1 },
  { id: 'l1_zero_schnaepse', level: 1, title: 'In einem Standardspiel 0 Schnäpse', xpReward: 5, titleReward: 'Jungfrau', metric: 'max_schnaepse', targetValue: 0, threshold: 0, targetCount: 1, gameMode: 'Standardspiel' },

  // --- LEVEL 2 ---
  { id: 'l2_10_standard', level: 2, title: 'Spiele 10 Standardspiele', xpReward: 10, metric: 'games_count', targetValue: 10, targetCount: 10, gameMode: 'Standardspiel' },
  { id: 'l2_5_speed', level: 2, title: 'Spiele 5 Speedwiegen', xpReward: 10, metric: 'games_count', targetValue: 5, targetCount: 5, gameMode: 'Speedwiegen' },
  { id: 'l2_5x_avg_sub5', level: 2, title: 'Erreiche 5x einen Durchschnitt < 5 Gramm', xpReward: 10, metric: 'avg_less_than', targetValue: 5.0, threshold: 5.0, targetCount: 5 },
  { id: 'l2_5x_total_sub7', level: 2, title: 'Erreiche 5x ein Total < 7 Gramm', xpReward: 10, metric: 'total_less_than', targetValue: 7.0, threshold: 7.0, targetCount: 5 },
  { id: 'l2_5x_sub4_schnaepse', level: 2, title: 'Spiele 5 Spiele mit weniger als 4 Schnäppse', xpReward: 10, metric: 'max_schnaepse', targetValue: 3, threshold: 3, targetCount: 5 }
];

export function getQuestTarget(quest: QuestDefinition): number {
  if (quest.targetCount !== undefined) return quest.targetCount;
  if (quest.metric === 'profile_pic') return 1;
  if (quest.metric === 'games_count') return quest.targetValue;
  if (quest.id === 'l1_avg_sub5' || quest.id === 'l1_total_sub6' || quest.id === 'l1_avg_sub25' || quest.id === 'l1_zero_schnaepse') return 1;
  if (quest.id === 'l2_5x_avg_sub5' || quest.id === 'l2_5x_total_sub7' || quest.id === 'l2_5x_sub4_schnaepse') return 5;
  return quest.targetValue;
}
