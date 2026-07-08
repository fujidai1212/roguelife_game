import { balance } from '../data/balance';
import { enemies } from '../data/enemies';
import { jobs } from '../data/jobs';
import { dungeonTexts } from '../data/texts/dungeon';
import { lifeTexts } from '../data/texts/life';
import type { DeathCause, EnemyInstance, LifeState } from './types';
import type { Rng } from './rng';

/**
 * 戦闘計算とダメージ処理の純粋ロジック（GAME_DESIGN.md セクション6）。
 * damage = max(1, attack - defense) * variance
 */

/** ダメージ計算。振れ幅は balance.combat.varianceMin〜Max */
export function rollDamage(rng: Rng, attack: number, defense: number): number {
  const { varianceMin, varianceMax } = balance.combat;
  const variance = varianceMin + rng.next() * (varianceMax - varianceMin);
  return Math.max(1, Math.round(Math.max(1, attack - defense) * variance));
}

/** 逃走成功率（素早さと運で決まる。盗賊のパッシブ「逃走強化」で加算される） */
export function fleeChance(life: LifeState): number {
  const { fleeBase, fleePerPoint, fleeMin, fleeMax } = balance.combat;
  const { agility, luck } = life.character.stats;
  const passives = jobs[life.character.jobId].passives;
  const bonus = passives.includes('fleeBonus') ? balance.skills.fleeBonus : 0;
  const chance = fleeBase + (agility + luck) * fleePerPoint + bonus;
  return Math.min(fleeMax, Math.max(fleeMin, chance));
}

/** プレイヤーが先手を取るか（盗賊のパッシブ「先制攻撃」は必ず先手） */
export function playerActsFirst(life: LifeState, enemy: EnemyInstance): boolean {
  if (jobs[life.character.jobId].passives.includes('firstStrike')) return true;
  return life.character.stats.agility >= enemy.agility;
}

interface DamageResult {
  life: LifeState;
  logs: string[];
  died: boolean;
}

/**
 * プレイヤーにダメージを与える。HPが0になったら死亡処理
 * （scene='death'、死因テキスト）まで行う。
 */
export function applyDamageToPlayer(
  life: LifeState,
  damage: number,
  cause: Exclude<DeathCause, 'oldAge'>,
  enemyName?: string,
): DamageResult {
  const newHp = life.character.stats.hp - damage;
  if (newHp > 0) {
    return {
      life: { ...life, character: { ...life.character, stats: { ...life.character.stats, hp: newHp } } },
      logs: [],
      died: false,
    };
  }
  const age = Math.floor(life.character.ageYears);
  const deathLog =
    cause === 'battle'
      ? dungeonTexts.death.battle(enemyName ?? '', age)
      : cause === 'trap'
        ? dungeonTexts.death.trap(age)
        : dungeonTexts.death.poison(age);
  return {
    life: {
      ...life,
      character: { ...life.character, stats: { ...life.character.stats, hp: 0 } },
      alive: false,
      deathCause: cause,
      scene: 'death',
      dungeon: undefined,
      combat: undefined,
    },
    logs: [deathLog, lifeTexts.deathSummary(life.character.gold)],
    died: true,
  };
}

interface EnemyTurnResult {
  life: LifeState;
  logs: string[];
  died: boolean;
}

/** 敵の攻撃1回ぶんを解決する（プレイヤーの防御力は現状0。装備は将来フェーズ） */
export function resolveEnemyAttack(rng: Rng, life: LifeState, enemy: EnemyInstance): EnemyTurnResult {
  const damage = rollDamage(rng, enemy.attack, 0);
  const name = enemies[enemy.defId].name;
  const result = applyDamageToPlayer(life, damage, 'battle', name);
  return {
    life: result.life,
    logs: [dungeonTexts.combat.enemyHit(name, damage), ...result.logs],
    died: result.died,
  };
}

/**
 * プレイヤーの攻撃1回ぶんを解決する。戻り値の enemy.hp が0以下なら撃破。
 * mode 'magic' は魔法攻撃（魔力で殴り、敵の防御を無視する。GAME_DESIGN.md セクション6）
 */
export function resolvePlayerAttack(
  rng: Rng,
  life: LifeState,
  enemy: EnemyInstance,
  mode: 'attack' | 'magic' = 'attack',
): { enemy: EnemyInstance; logs: string[] } {
  const name = enemies[enemy.defId].name;
  const damage =
    mode === 'magic'
      ? rollDamage(rng, life.character.stats.magic, 0)
      : rollDamage(rng, life.character.stats.strength, enemy.defense);
  const log =
    mode === 'magic'
      ? dungeonTexts.combat.magicHit(name, damage)
      : dungeonTexts.combat.playerHit(name, damage);
  return { enemy: { ...enemy, hp: enemy.hp - damage }, logs: [log] };
}
