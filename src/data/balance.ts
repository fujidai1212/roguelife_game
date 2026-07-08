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
    /** ダンジョン内で1ノード進む（危険を伴うので小さく） */
    dungeonMove: 0.05,
    /** 戦闘コマンド1回（死のリスクを背負う行動なので極小） */
    combatTurn: 0.02,
    /** 野営地で眠って次のフロアへ（安全な行動なので重い。3.4の「中程度」） */
    campSleep: 1,
    /** 野営地で休息して回復のみ（安全な回復なのでそれなりに重い） */
    campRest: 0.3,
    /** 歩いて帰還する際の1フロアぶん */
    retreatPerFloor: 0.2,
  },
  dungeon: {
    /** 1フロアの中間段（入場地点と野営地の間の行数）の範囲 */
    rowsMin: 4,
    rowsMax: 6,
    /** 1つの段に並ぶノード数の上限（進行選択肢は最大3つなので3以下にする） */
    rowWidthMax: 3,
    /** 必須の接続に加えて余分なエッジ（分岐）を張る確率 */
    extraEdgeChance: 0.35,
    /** 中間ノードの内容の重み（相対値） */
    nodeWeights: { enemy: 45, chest: 20, fountain: 15, empty: 20 },
    /** 気配テキストをノード内容に応じたものにする確率（残りは汎用。確定情報にしない） */
    kindHintChance: 0.5,
    chest: {
      /** 罠が仕掛けられている確率 */
      trapChance: 0.25,
      /** 罠ダメージの基本値（深度スケール前） */
      trapDamageBase: 8,
      /** 中身の金の基本値（深度スケール前） */
      goldBase: 30,
      /** 金額の振れ幅（±この割合） */
      goldVariance: 0.3,
      /** 深度1つごとの中身の増加率 */
      scalePerDepth: 0.2,
    },
    fountain: {
      /** 毒の泉である確率 */
      poisonChance: 0.5,
      /** 回復量（最大HPに対する割合） */
      healFraction: 0.5,
      /** 毒ダメージの基本値（深度スケール前） */
      poisonDamageBase: 10,
      /** 深度1つごとの毒ダメージ増加率 */
      poisonScalePerDepth: 0.15,
    },
    /** 歩いて帰還中、1フロアごとに敵と遭遇する確率 */
    retreatEncounterChance: 0.35,
    /** 野営地で休息したときの回復量（最大HPに対する割合） */
    campRestHealFraction: 0.5,
  },
  combat: {
    /** ダメージの振れ幅: damage = max(1, attack - defense) * variance */
    varianceMin: 0.85,
    varianceMax: 1.15,
    /** 深度1つごとの敵ステータス増加率 */
    enemyScalePerDepth: 0.15,
    /** 逃走成功率 = fleeBase + (素早さ+運) * fleePerPoint（fleeMin〜fleeMaxに収める） */
    fleeBase: 0.3,
    fleePerPoint: 0.015,
    fleeMin: 0.1,
    fleeMax: 0.9,
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
