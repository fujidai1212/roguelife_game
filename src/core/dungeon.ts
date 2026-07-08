import { balance } from '../data/balance';
import { enemies, enemyPool } from '../data/enemies';
import { dungeonTexts } from '../data/texts/dungeon';
import type { Rng } from './rng';
import type { DungeonNode, DungeonNodeKind, EnemyInstance } from './types';

/**
 * ダンジョンのフロアグラフ生成と深度スケーリングの純粋ロジック
 * （GAME_DESIGN.md セクション5）。
 * グラフはプレイヤーには見せない。UIは現在ノードの edges だけを選択肢にする。
 */

/** 深度によるスケール倍率（敵ステータス・宝の中身に共通の形） */
export function depthMultiplier(depth: number, scalePerDepth: number): number {
  return 1 + scalePerDepth * (depth - 1);
}

/** 中間ノードの内容を重み付きで抽選する */
function rollNodeKind(rng: Rng): DungeonNodeKind {
  const weights = balance.dungeon.nodeWeights;
  const entries = Object.entries(weights) as [keyof typeof weights, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll < 0) return kind;
  }
  return entries[entries.length - 1][0];
}

/** ノードの気配テキストを選ぶ。確定情報にならないよう、汎用文も混ぜる */
function rollHint(rng: Rng, kind: DungeonNodeKind): string {
  const { generic, byKind } = dungeonTexts.hints;
  const useKind = rng.chance(balance.dungeon.kindHintChance) && byKind[kind].length > 0;
  return rng.pick(useKind ? byKind[kind] : generic);
}

/**
 * 1フロアぶんのグラフを生成する。
 * 構造: 入場地点（段0・1ノード）→ 中間段（各1〜rowWidthMax ノード）→ 野営地（最終段・1ノード）。
 * エッジは必ず次の段へ向かい、全ノードが「入場地点から到達可能」かつ
 * 「野営地へ到達可能」になるように張る。1ノードの進行先は最大 rowWidthMax（=3）。
 */
export function generateFloor(rng: Rng): DungeonNode[] {
  const b = balance.dungeon;
  const middleRows = rng.int(b.rowsMin, b.rowsMax);

  // 段ごとのノードを作る
  const nodes: DungeonNode[] = [];
  const rows: DungeonNode[][] = [];
  let nextId = 0;
  const addRow = (kinds: DungeonNodeKind[], row: number) => {
    const rowNodes = kinds.map((kind) => {
      const node: DungeonNode = { id: nextId++, row, kind, hint: rollHint(rng, kind), edges: [] };
      nodes.push(node);
      return node;
    });
    rows.push(rowNodes);
  };

  addRow(['entrance'], 0);
  for (let r = 1; r <= middleRows; r++) {
    const width = rng.int(1, b.rowWidthMax);
    addRow(Array.from({ length: width }, () => rollNodeKind(rng)), r);
  }
  addRow(['camp'], middleRows + 1);

  // 段と段の間にエッジを張る
  for (let r = 0; r < rows.length - 1; r++) {
    const parents = rows[r];
    const children = rows[r + 1];

    // 全ての子に親を1つ（→入場地点から到達可能）、全ての親に子を1つ（→野営地へ到達可能）
    for (const child of children) {
      const parent = rng.pick(parents);
      if (!parent.edges.includes(child.id)) parent.edges.push(child.id);
    }
    for (const parent of parents) {
      if (parent.edges.length === 0) {
        parent.edges.push(rng.pick(children).id);
      }
    }
    // 余分な分岐を確率で追加する（進行先は最大 rowWidthMax なので上限は自然に守られる）
    for (const parent of parents) {
      for (const child of children) {
        if (!parent.edges.includes(child.id) && rng.chance(b.extraEdgeChance)) {
          parent.edges.push(child.id);
        }
      }
      parent.edges.sort((a, z) => a - z);
    }
  }

  return nodes;
}

/** その深度で出現しうる敵を抽選し、深度スケールを適用した個体を作る */
export function createEnemyInstance(rng: Rng, depth: number): EnemyInstance {
  const candidates = enemyPool.filter((id) => enemies[id].minDepth <= depth);
  const def = enemies[rng.pick(candidates)];
  const mult = depthMultiplier(depth, balance.combat.enemyScalePerDepth);
  const maxHp = Math.round(def.maxHp * mult);
  return {
    defId: def.id,
    hp: maxHp,
    maxHp,
    attack: Math.round(def.attack * mult),
    defense: Math.round(def.defense * mult),
    agility: Math.round(def.agility * mult),
    goldMin: Math.round(def.goldMin * mult),
    goldMax: Math.round(def.goldMax * mult),
  };
}

/** 宝箱の中身の金額を決める（深度スケール＋振れ幅） */
export function rollChestGold(rng: Rng, depth: number): number {
  const c = balance.dungeon.chest;
  const base = c.goldBase * depthMultiplier(depth, c.scalePerDepth);
  const variance = 1 - c.goldVariance + rng.next() * c.goldVariance * 2;
  return Math.max(1, Math.round(base * variance));
}

/** 宝箱の罠ダメージ（深度スケール） */
export function rollTrapDamage(depth: number): number {
  const c = balance.dungeon.chest;
  return Math.round(c.trapDamageBase * depthMultiplier(depth, c.scalePerDepth));
}

/** 毒の泉のダメージ（深度スケール） */
export function rollPoisonDamage(depth: number): number {
  const f = balance.dungeon.fountain;
  return Math.round(f.poisonDamageBase * depthMultiplier(depth, f.poisonScalePerDepth));
}
