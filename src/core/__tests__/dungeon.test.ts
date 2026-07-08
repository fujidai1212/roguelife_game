import { describe, expect, it } from 'vitest';

import { balance } from '../../data/balance';
import { enemies } from '../../data/enemies';
import {
  createEnemyInstance,
  depthMultiplier,
  generateFloor,
  rollChestGold,
  rollPoisonDamage,
  rollTrapDamage,
} from '../dungeon';
import { createRng } from '../rng';

const b = balance.dungeon;

describe('generateFloor: フロアグラフ生成の不変条件', () => {
  it('多数のシードで、構造が常に正しい', () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      const nodes = generateFloor(rng);

      // 起点は入場地点、終点は野営地
      expect(nodes[0].kind).toBe('entrance');
      expect(nodes[0].row).toBe(0);
      const camp = nodes[nodes.length - 1];
      expect(camp.kind).toBe('camp');
      expect(camp.edges).toEqual([]);

      const lastRow = camp.row;
      expect(lastRow).toBeGreaterThanOrEqual(b.rowsMin + 1);
      expect(lastRow).toBeLessThanOrEqual(b.rowsMax + 1);

      const byId = new Map(nodes.map((n) => [n.id, n]));
      for (const node of nodes) {
        if (node.kind === 'camp') continue;
        // 進行先は1〜3つ（最大3択のUI制約）で、必ず次の段を指す
        expect(node.edges.length).toBeGreaterThanOrEqual(1);
        expect(node.edges.length).toBeLessThanOrEqual(3);
        for (const edge of node.edges) {
          expect(byId.get(edge)?.row).toBe(node.row + 1);
        }
        // 気配テキストが必ずある
        expect(node.hint.length).toBeGreaterThan(0);
      }

      // 入場地点以外の全ノードに、前の段からの入口がある（＝全ノード到達可能）
      const hasIncoming = new Set(nodes.flatMap((n) => n.edges));
      for (const node of nodes) {
        if (node.row === 0) continue;
        expect(hasIncoming.has(node.id)).toBe(true);
      }

      // 中間ノードの内容は許可された種類のみ
      for (const node of nodes) {
        if (node.row === 0 || node.row === lastRow) continue;
        expect(Object.keys(b.nodeWeights)).toContain(node.kind);
      }
    }
  });

  it('同じシードからは同じフロアができる（決定性）', () => {
    expect(generateFloor(createRng(42))).toEqual(generateFloor(createRng(42)));
  });
});

describe('深度スケーリング', () => {
  it('depthMultiplier は深度1で等倍、深くなるほど大きい', () => {
    expect(depthMultiplier(1, 0.15)).toBe(1);
    expect(depthMultiplier(5, 0.15)).toBeCloseTo(1.6);
  });

  it('敵は深度スケール後のステータスを持ち、深いほど強い', () => {
    const depth = 5;
    const rng = createRng(1);
    const instance = createEnemyInstance(rng, depth);
    const def = enemies[instance.defId];
    const mult = depthMultiplier(depth, balance.combat.enemyScalePerDepth);
    expect(instance.maxHp).toBe(Math.round(def.maxHp * mult));
    expect(instance.attack).toBe(Math.round(def.attack * mult));
    expect(instance.hp).toBe(instance.maxHp);
    expect(instance.maxHp).toBeGreaterThan(def.maxHp);
  });

  it('minDepth より浅い場所にその敵は出ない', () => {
    const rng = createRng(2);
    for (let i = 0; i < 100; i++) {
      const instance = createEnemyInstance(rng, 1);
      expect(enemies[instance.defId].minDepth).toBeLessThanOrEqual(1);
    }
  });

  it('宝箱の金・罠ダメージ・毒ダメージも深度で増える', () => {
    const rng = createRng(3);
    const c = b.chest;
    for (let i = 0; i < 50; i++) {
      const gold = rollChestGold(rng, 3);
      const base = c.goldBase * depthMultiplier(3, c.scalePerDepth);
      expect(gold).toBeGreaterThanOrEqual(Math.round(base * (1 - c.goldVariance)) - 1);
      expect(gold).toBeLessThanOrEqual(Math.round(base * (1 + c.goldVariance)) + 1);
    }
    expect(rollTrapDamage(5)).toBeGreaterThan(rollTrapDamage(1));
    expect(rollPoisonDamage(5)).toBeGreaterThan(rollPoisonDamage(1));
  });
});
