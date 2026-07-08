/**
 * 数値バランスの集約ファイル（CLAUDE.md アーキテクチャ原則4）。
 * マジックナンバーはコードに書かず、必ずここに置く。
 * TODO: すべて初期案の仮置き。フェーズ5のバランス調整パスで見直す。
 */

export const balance = {
  creation: {
    /** 各ステータス（力・素早さ・魔力・運）のロール: 2d6 + 3 */
    statDice: { count: 2, sides: 6, bonus: 3 },
    /** 最大HPのロール: 20 + 2d6 */
    hpBase: 20,
    hpDice: { count: 2, sides: 6, bonus: 0 },
    /** 年齢ロールの範囲 */
    ageMin: 16,
    ageMax: 40,
    /** この年数だけ年上なごとに、初期ステータス+1（年上ほど強いが先が短い） */
    ageBonusPerYears: 8,
    /** 初期所持金のロール: 2d6 × 5 G */
    startingGoldDice: { count: 2, sides: 6, bonus: 0 },
    startingGoldMultiplier: 5,
  },
  time: {
    /** この日数で1歳加齢する */
    daysPerYear: 30,
  },
  aging: {
    /** この年齢を超えると加齢のたびに衰える */
    declineStartAge: 45,
    /** 1歳ごとの減少量 */
    statLossPerYear: 1,
    maxHpLossPerYear: 3,
    /** ステータスの下限 */
    statFloor: 1,
    /** 寿命 = lifespanBase + 0〜lifespanRandomMax のランダム */
    lifespanBase: 60,
    lifespanRandomMax: 15,
  },
  work: {
    /** 日雇い労働の日当（G） */
    dayLaborPayMin: 8,
    dayLaborPayMax: 15,
  },
  tavern: {
    /** 噂を聞くための酒代（G） */
    rumorPrice: 5,
  },
} as const;
