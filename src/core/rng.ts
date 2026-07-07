/**
 * シード可能な乱数生成器（PRNG）。
 * アルゴリズムは mulberry32（32bit 状態・高速・十分な品質）。
 * 同じシードからは必ず同じ乱数列が得られるため、テストとバランス検証に使う。
 * 状態は number 1個なので、セーブデータへの保存・復元が容易。
 */

export interface Rng {
  /** 現在の内部状態を返す（セーブ用）。restoreRng に渡すと続きから再現できる */
  getState(): number;
  /** [0, 1) の一様乱数 */
  next(): number;
  /** min 以上 max 以下の整数（両端を含む） */
  int(min: number, max: number): number;
  /** 確率 p（0〜1）で true */
  chance(p: number): boolean;
  /** 配列から1要素を等確率で選ぶ。空配列はエラー */
  pick<T>(items: readonly T[]): T;
  /** 配列をシャッフルした新しい配列を返す（元の配列は変更しない） */
  shuffle<T>(items: readonly T[]): T[];
}

function fromState(state: number): Rng {
  let s = state >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    getState: () => s,
    next,
    int(min, max) {
      if (max < min) {
        throw new Error(`int(): max (${max}) must be >= min (${min})`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error('pick(): items must not be empty');
      }
      return items[Math.floor(next() * items.length)];
    },
    shuffle(items) {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

/** 新しい乱数生成器を作る。シード省略時は現在時刻ベース */
export function createRng(seed: number = Date.now()): Rng {
  return fromState(seed);
}

/** セーブされた状態から乱数生成器を復元する */
export function restoreRng(state: number): Rng {
  return fromState(state);
}
