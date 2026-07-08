import { balance } from '../data/balance';
import { jobs } from '../data/jobs';
import { advanceAge } from './aging';
import type { ActionResult, GameState, LifeState } from './types';

/** アクションハンドラ間で共有する小さなヘルパー群 */

/**
 * 盗みの成功率（道具屋・行商人で共通）。
 * 素早さと運が高いほど、安い品ほど成功しやすい。盗賊はさらに有利。
 */
export function stealSuccessChance(life: LifeState, itemPrice: number): number {
  const t = balance.theft;
  const { agility, luck } = life.character.stats;
  const thiefBonus = jobs[life.character.jobId].passives.includes('stealBonus')
    ? t.thiefBonus
    : 0;
  const chance = t.base + (agility + luck) * t.perPoint + thiefBonus - itemPrice * t.priceRisk;
  return Math.min(t.max, Math.max(t.min, chance));
}

/** 死亡チェックつきで LifeState を取り出す。場面指定があれば一致も確認する */
export function requireLife(state: GameState, scene?: LifeState['scene']): LifeState | null {
  const life = state.life;
  if (state.phase !== 'life' || !life || !life.alive) return null;
  if (scene && life.scene !== scene) return null;
  return life;
}

/** 不正な状態でのアクションは何もしない（多重タップ対策も兼ねる） */
export function noop(state: GameState): ActionResult {
  return { state, logs: [] };
}

/**
 * 年齢コストを支払う。老衰死した場合はダンジョン・戦闘の状態も片付ける
 * （死亡後の scene は advanceAge が 'death' にしている）。
 */
export function payAge(
  life: LifeState,
  cost: number,
): { life: LifeState; logs: string[]; died: boolean } {
  const advanced = advanceAge(life, cost);
  if (!advanced.life.alive) {
    return {
      life: { ...advanced.life, dungeon: undefined, combat: undefined },
      logs: advanced.logs,
      died: true,
    };
  }
  return { life: advanced.life, logs: advanced.logs, died: false };
}

/** life を差し替えて rng の状態を保存した ActionResult を作る */
export function commit(
  state: GameState,
  rngState: number,
  life: LifeState,
  logs: string[],
): ActionResult {
  return { state: { ...state, life, rngState }, logs };
}
