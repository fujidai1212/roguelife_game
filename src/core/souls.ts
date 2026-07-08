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
  /** 中ボス・ボスはフェーズ5で実装。それまでは常に0 */
  midBossKills: number;
  bossKills: number;
}

function toRecord(life: LifeState): LifeRecord {
  return {
    depth: life.maxDepth,
    gold: life.character.gold,
    kills: life.kills,
    yearsLived: Math.max(0, life.character.ageYears - balance.creation.startAge),
    midBossKills: 0,
    bossKills: 0,
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
  const cap = b.tiers.find((t) => t.tier === tier)?.cap ?? 0;

  const raw =
    record.yearsLived * b.perYearLived +
    record.kills * b.perKill +
    record.gold / b.goldPerSoul;
  const bonus = life.deathCause === 'retired' ? b.retireBonusMultiplier : 1;
  const souls = Math.floor(raw * bonus);

  return { tier, souls: cap === null ? souls : Math.min(cap, souls) };
}

/** 人生の終わりをメタ状態（魂・統計）に反映する。引退は死亡数に数えない */
export function applyLifeEndToMeta(
  meta: MetaState,
  life: LifeState,
  settlement: Settlement,
): MetaState {
  return {
    ...meta,
    souls: meta.souls + settlement.souls,
    totalDeaths: life.deathCause === 'retired' ? meta.totalDeaths : meta.totalDeaths + 1,
    totalKills: meta.totalKills + life.kills,
    bestDepth: Math.max(meta.bestDepth, life.maxDepth),
  };
}
