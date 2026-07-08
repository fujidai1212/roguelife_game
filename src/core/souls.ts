import { balance } from '../data/balance';
import type { LifeState, MetaState } from './types';

/**
 * 魂精算の純粋ロジック（GAME_DESIGN.md セクション7）。
 * 人生が終わったとき（死亡・老衰・引退）、その生涯の実績から獲得魂を計算する。
 */

export interface Settlement {
  tier: number;
  souls: number;
}

/** ティア判定・精算に使う、その人生の実績 */
interface LifeRecord {
  depth: number;
  gold: number;
  kills: number;
  yearsLived: number;
  midBossKills: number;
  bossKills: number;
}

function toRecord(life: LifeState): LifeRecord {
  return {
    depth: life.maxDepth,
    gold: life.character.gold,
    kills: life.kills,
    yearsLived: Math.max(0, life.character.ageYears - balance.creation.startAge),
    midBossKills: life.midBossKills,
    bossKills: life.bossKills,
  };
}

type TierCondition = (typeof balance.souls.tiers)[number]['anyOf'][number];

function meets(record: LifeRecord, cond: TierCondition): boolean {
  switch (cond.kind) {
    case 'depth':
      return record.depth >= cond.value;
    case 'gold':
      return record.gold >= cond.value;
    case 'midBossKills':
      return record.midBossKills >= cond.value;
    case 'bossKills':
      return record.bossKills >= cond.value;
  }
}

/** 達成度ティアを判定する（上位から順に、最初に条件を満たしたもの） */
export function evaluateTier(life: LifeState): number {
  const record = toRecord(life);
  for (const tier of balance.souls.tiers) {
    if (tier.anyOf.length === 0 || tier.anyOf.some((cond) => meets(record, cond))) {
      return tier.tier;
    }
  }
  return 0;
}

/** 人生の終わりに獲得する魂を計算する（ティア上限でキャップ） */
export function settleLife(life: LifeState): Settlement {
  const b = balance.souls;
  const record = toRecord(life);
  const tier = evaluateTier(life);
  // cap は null が「上限なし」を意味するので、?? で潰さないこと（ティアが見つからない場合のみ0）
  const tierDef = b.tiers.find((t) => t.tier === tier);
  const cap = tierDef ? tierDef.cap : 0;

  const raw =
    record.yearsLived * b.perYearLived +
    record.kills * b.perKill +
    record.gold / b.goldPerSoul;
  const retireBonus = life.deathCause === 'retired' ? b.retireBonusMultiplier : 1;
  const souls = Math.floor(raw * retireBonus);
  const capped = cap === null ? souls : Math.min(cap, souls);

  // レアモンスター等の魂ボーナスはティア上限の外側で加算する
  return { tier, souls: capped + life.bonusSouls };
}

/** 人生の終わりをメタ状態（魂・統計）に反映する。引退・大団円は死亡数に数えない */
export function applyLifeEndToMeta(
  meta: MetaState,
  life: LifeState,
  settlement: Settlement,
): MetaState {
  const isDeath = life.deathCause !== 'retired' && life.deathCause !== 'victory';
  return {
    ...meta,
    souls: meta.souls + settlement.souls,
    totalDeaths: isDeath ? meta.totalDeaths + 1 : meta.totalDeaths,
    totalKills: meta.totalKills + life.kills,
    totalMidBossKills: meta.totalMidBossKills + life.midBossKills,
    totalBossKills: meta.totalBossKills + life.bossKills,
    bestDepth: Math.max(meta.bestDepth, life.maxDepth),
  };
}
