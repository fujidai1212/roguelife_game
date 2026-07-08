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
    /** 開始年齢。全キャラ共通の固定値（GAME_DESIGN.md セクション2） */
    startAge: 18,
    /** ステータス振り直しの上限回数 */
    rerollMax: 3,
    /** 初期所持金のロール: 2d6 × 5 G */
    startingGoldDice: { count: 2, sides: 6, bonus: 0 },
    startingGoldMultiplier: 5,
  },
  /**
   * 行動ごとの年齢コスト（GAME_DESIGN.md セクション3）。
   * 「安全なほど高く、危険なほど低く」の逆相関を崩さないこと。
   */
  ageCosts: {
    /** 酒場で噂を聞く（無リスクの情報収集: 極小） */
    tavernRumor: 0.02,
  },
  work: {
    /** 労働の契約年数の選択肢。ボタンとしてこの順に並ぶ（最大4つ） */
    durationChoicesYears: [1, 3, 5, 10],
    /** 年あたりの基本報酬（G）のレンジ */
    payPerYearMin: 45,
    payPerYearMax: 55,
    /** 契約が1年延びるごとに年あたり効率が+10%（長期ほどリターン逓増） */
    efficiencyBonusPerExtraYear: 0.1,
  },
  aging: {
    /** この年齢を超えると加齢（誕生日を越える）のたびに衰える */
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
  tavern: {
    /** 噂を聞くための酒代（G） */
    rumorPrice: 5,
  },
} as const;
