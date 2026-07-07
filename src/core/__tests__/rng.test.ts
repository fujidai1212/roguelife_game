import { describe, expect, it } from 'vitest';

import { createRng, restoreRng } from '../rng';

describe('rng', () => {
  it('同じシードからは同じ乱数列が得られる', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('異なるシードからは異なる乱数列が得られる', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() は [0, 1) の範囲を返す', () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min, max) は両端を含む範囲の整数を返し、いずれ両端が出る', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(1, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('int() は max < min のときエラーを投げる', () => {
    const rng = createRng(1);
    expect(() => rng.int(5, 1)).toThrow();
  });

  it('pick() は配列の要素を返し、空配列ではエラーを投げる', () => {
    const rng = createRng(9);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
    expect(() => rng.pick([])).toThrow();
  });

  it('shuffle() は同じ要素を保ち、元の配列を変更しない', () => {
    const rng = createRng(3);
    const original = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('getState() で保存した状態から restoreRng() で続きを再現できる', () => {
    const rng = createRng(999);
    rng.next();
    rng.next();
    const saved = rng.getState();
    const expected = [rng.next(), rng.next(), rng.next()];

    const restored = restoreRng(saved);
    const actual = [restored.next(), restored.next(), restored.next()];
    expect(actual).toEqual(expected);
  });
});
