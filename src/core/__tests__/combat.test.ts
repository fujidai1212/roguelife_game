import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import {
  applyDamageToPlayer,
  fleeChance,
  resolvePlayerAttack,
  rollDamage,
} from '../combat';
import { createRng } from '../rng';
import type { EnemyInstance, LifeState } from '../types';

function makeLife(overrides: Partial<LifeState> = {}): LifeState {
  return {
    character: {
      jobId: 'jobless',
      stats: { maxHp: 30, hp: 30, strength: 10, agility: 10, magic: 10, luck: 10 },
      ageYears: 20,
      gold: 50,
      items: {},
    },
    lifespanYears: 70,
    scene: 'combat',
    alive: true,
    kills: 0,
    maxDepth: 1,
    dungeon: { depth: 1, nodes: [], currentNodeId: 0 },
    ...overrides,
  };
}

const enemy: EnemyInstance = {
  defId: 'slime',
  hp: 8,
  maxHp: 8,
  attack: 4,
  defense: 1,
  agility: 3,
  goldMin: 3,
  goldMax: 8,
};

describe('rollDamage: ダメージ計算', () => {
  it('damage = max(1, attack - defense) * variance の範囲に収まる', () => {
    const rng = createRng(1);
    const { varianceMin, varianceMax } = balance.combat;
    for (let i = 0; i < 200; i++) {
      const damage = rollDamage(rng, 10, 3);
      expect(damage).toBeGreaterThanOrEqual(Math.round(7 * varianceMin));
      expect(damage).toBeLessThanOrEqual(Math.round(7 * varianceMax));
    }
  });

  it('防御が攻撃以上でも最低1ダメージは通る', () => {
    const rng = createRng(2);
    for (let i = 0; i < 50; i++) {
      expect(rollDamage(rng, 3, 100)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('fleeChance: 逃走成功率', () => {
  it('素早さ・運が高いほど上がり、上限・下限に収まる', () => {
    const slow = makeLife();
    slow.character.stats.agility = 0;
    slow.character.stats.luck = 0;
    const fast = makeLife();
    fast.character.stats.agility = 99;
    fast.character.stats.luck = 99;
    expect(fleeChance(fast)).toBeGreaterThan(fleeChance(slow));
    expect(fleeChance(fast)).toBeLessThanOrEqual(balance.combat.fleeMax);
    expect(fleeChance(slow)).toBeGreaterThanOrEqual(balance.combat.fleeMin);
  });
});

describe('applyDamageToPlayer: 被ダメージと死亡処理', () => {
  it('致命傷でなければHPが減るだけ', () => {
    const result = applyDamageToPlayer(makeLife(), 10, 'battle', 'スライム');
    expect(result.died).toBe(false);
    expect(result.life.character.stats.hp).toBe(20);
    expect(result.life.alive).toBe(true);
  });

  it('HPが0以下になると死亡し、ダンジョン・戦闘の状態が片付く', () => {
    const life = makeLife({ combat: { enemy, menu: 'main', context: 'node' } });
    const result = applyDamageToPlayer(life, 999, 'battle', 'スライム');
    expect(result.died).toBe(true);
    expect(result.life.alive).toBe(false);
    expect(result.life.scene).toBe('death');
    expect(result.life.deathCause).toBe('battle');
    expect(result.life.character.stats.hp).toBe(0);
    expect(result.life.dungeon).toBeUndefined();
    expect(result.life.combat).toBeUndefined();
    expect(result.logs.length).toBeGreaterThan(0);
  });

  it('死因によってテキストが変わる', () => {
    const battle = applyDamageToPlayer(makeLife(), 999, 'battle', 'スライム');
    const trap = applyDamageToPlayer(makeLife(), 999, 'trap');
    const poison = applyDamageToPlayer(makeLife(), 999, 'poison');
    expect(battle.logs[0]).not.toBe(trap.logs[0]);
    expect(trap.logs[0]).not.toBe(poison.logs[0]);
  });
});

describe('resolvePlayerAttack: プレイヤーの攻撃', () => {
  it('敵のHPが減る（元のオブジェクトは変更しない）', () => {
    const rng = createRng(3);
    const result = resolvePlayerAttack(rng, makeLife(), enemy);
    expect(result.enemy.hp).toBeLessThan(enemy.hp);
    expect(enemy.hp).toBe(8);
    expect(result.logs.length).toBe(1);
  });
});
