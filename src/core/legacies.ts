import { legacies, type LegacyDef, type LegacyStatBonus } from '../data/legacies';
import type { ItemId, MetaState } from './types';

/**
 * レガシー（来世への恩恵）の判定と効果適用の純粋ロジック
 * （GAME_DESIGN.md セクション7）。定義は src/data/legacies.ts に置く。
 */

/** メタ統計に対して条件を満たしているか */
function conditionMet(meta: MetaState, legacy: LegacyDef): boolean {
  const c = legacy.condition;
  switch (c.kind) {
    case 'bestDepth':
      return meta.bestDepth >= c.value;
    case 'totalDeaths':
      return meta.totalDeaths >= c.value;
    case 'totalKills':
      return meta.totalKills >= c.value;
    case 'totalMidBossKills':
      return meta.totalMidBossKills >= c.value;
    case 'totalBossKills':
      return meta.totalBossKills >= c.value;
  }
}

/** まだ解放されていないレガシーのうち、条件を満たしたものを返す */
export function newlyUnlockedLegacies(meta: MetaState): LegacyDef[] {
  return legacies.filter(
    (legacy) => !meta.unlockedLegacies.includes(legacy.id) && conditionMet(meta, legacy),
  );
}

/** 解放済みレガシーの定義一覧 */
function unlockedDefs(meta: MetaState): LegacyDef[] {
  return legacies.filter((legacy) => meta.unlockedLegacies.includes(legacy.id));
}

/** 道具屋の実売価格（shopDiscount レガシーを適用） */
export function shopPrice(meta: MetaState, basePrice: number): number {
  let price = basePrice;
  for (const legacy of unlockedDefs(meta)) {
    if (legacy.effect.kind === 'shopDiscount') {
      price = Math.round(price * (1 - legacy.effect.percent / 100));
    }
  }
  return Math.max(1, price);
}

/** 来世の開始時ボーナス（startingGold / startingItem / statBonus レガシーを合算） */
export function startingBonuses(meta: MetaState): {
  gold: number;
  items: Partial<Record<ItemId, number>>;
  stats: Required<LegacyStatBonus>;
} {
  let gold = 0;
  const items: Partial<Record<ItemId, number>> = {};
  const stats: Required<LegacyStatBonus> = { maxHp: 0, strength: 0, agility: 0, magic: 0, luck: 0 };
  for (const legacy of unlockedDefs(meta)) {
    if (legacy.effect.kind === 'startingGold') {
      gold += legacy.effect.amount;
    } else if (legacy.effect.kind === 'startingItem') {
      items[legacy.effect.itemId] = (items[legacy.effect.itemId] ?? 0) + legacy.effect.count;
    } else if (legacy.effect.kind === 'statBonus') {
      for (const key of Object.keys(stats) as (keyof LegacyStatBonus)[]) {
        stats[key] += legacy.effect.stats[key] ?? 0;
      }
    }
  }
  return { gold, items, stats };
}
