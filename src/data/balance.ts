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
    /** カード賭博1回（低リスクの賭け事: 極小） */
    cards: 0.02,
    /** ロシアンルーレット1回（即死リスクを背負うので意図的に最安。3.1の例外則） */
    roulette: 0.01,
    /** 盗み1回（捕まるリスクを背負うので小さく） */
    theft: 0.05,
    /** 牢屋からの脱獄の試み（死のリスクがあるので小さく） */
    jailEscape: 0.05,
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
  /** 盗み（道具屋・行商人）。成功率 = base + (素早さ+運)×perPoint + 盗賊補正 − 品物の価格×priceRisk */
  theft: {
    base: 0.35,
    perPoint: 0.015,
    /** 盗賊のパッシブ「盗みの心得」による加算 */
    thiefBonus: 0.25,
    /** 高価な品ほど盗みにくい（価格1Gあたりの成功率減少） */
    priceRisk: 0.001,
    min: 0.05,
    max: 0.9,
    /** 町で捕まったとき、牢屋行きではなく用心棒との戦闘になる確率 */
    caughtFightChance: 0.5,
  },
  jail: {
    /** 刑期を務める場合の年齢コスト（安全な選択なので重い） */
    sentenceYears: 1,
    /** 脱獄成功率 = base + (素早さ+運)×perPoint（min〜maxに収める）。失敗は死 */
    escapeBase: 0.25,
    escapePerPoint: 0.01,
    escapeMin: 0.05,
    escapeMax: 0.75,
  },
  gamble: {
    /** カード賭博の掛け金の選択肢（G） */
    cardBets: [10, 50],
    /** カード賭博の勝率（胴元が少し有利） */
    cardWinChance: 0.45,
    /** 勝ったときの払い戻し倍率（掛け金×この値が戻る） */
    cardPayoutMultiplier: 2,
    /** ロシアンルーレットの掛け金（G） */
    rouletteBet: 30,
    /** 死ぬ確率（6連発の1発） */
    rouletteDeathChance: 1 / 6,
    /** 生き残ったときの払い戻し倍率 */
    roulettePayoutMultiplier: 4,
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
    nodeWeights: { enemy: 40, chest: 16, fountain: 12, empty: 16, trash: 8, merchant: 4, trap: 4 },
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
    /** ゴミの山を漁った結果の確率（残りは「何もない」） */
    trash: {
      itemChance: 0.35,
      damageChance: 0.25,
      /** 見つかるアイテムの重み */
      itemWeights: { herb: 60, potion: 30, returnScroll: 10 },
      /** 悪いものを掴んだときのダメージ（深度スケール前） */
      damageBase: 6,
    },
    /** ダンジョン内の行商人 */
    merchant: {
      /** 町の道具屋に対する価格の割増率 */
      priceMarkup: 1.5,
    },
    /** 床の罠ノード。回避率 = base + (素早さ+運)×perPoint（maxまで） */
    floorTrap: {
      avoidBase: 0.3,
      avoidPerPoint: 0.015,
      avoidMax: 0.9,
      /** 踏んだときのダメージ（深度スケール前） */
      damageBase: 10,
    },
    /** レアモンスター（金色のスライム）: 敵ノードがこれに置き換わる確率と魂ボーナス */
    rare: {
      chance: 0.06,
      bonusSouls: 3,
    },
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
  skills: {
    /** 聖騎士「自己回復」の回復量（最大HPに対する割合） */
    selfHealFraction: 0.35,
    /** 盗賊のパッシブ「逃走強化」による逃走成功率への加算 */
    fleeBonus: 0.2,
  },
  /**
   * 魂精算（GAME_DESIGN.md セクション7）。
   * 獲得魂 = floor((生きた年数×perYearLived + 撃破数×perKill + 所持金÷goldPerSoul)
   *          × 引退ボーナス) をティア上限でキャップ。
   */
  souls: {
    perYearLived: 0.5,
    perKill: 1,
    /** この金額ごとに魂1 */
    goldPerSoul: 100,
    /** 自主引退時の獲得倍率（若干のボーナス） */
    retireBonusMultiplier: 1.2,
    /**
     * 達成度ティア（上から順に判定し、最初に条件を満たしたものになる）。
     * cap が null のティアは上限なし。midBossKills/bossKills はフェーズ5で実装。
     */
    tiers: [
      { tier: 4, cap: null, anyOf: [{ kind: 'bossKills', value: 1 }] },
      {
        tier: 3,
        cap: 80,
        anyOf: [
          { kind: 'depth', value: 10 },
          { kind: 'midBossKills', value: 2 },
        ],
      },
      {
        tier: 2,
        cap: 40,
        anyOf: [
          { kind: 'depth', value: 6 },
          { kind: 'midBossKills', value: 1 },
          { kind: 'gold', value: 2000 },
        ],
      },
      {
        tier: 1,
        cap: 15,
        anyOf: [
          { kind: 'depth', value: 3 },
          { kind: 'gold', value: 500 },
        ],
      },
      { tier: 0, cap: 5, anyOf: [] },
    ],
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
