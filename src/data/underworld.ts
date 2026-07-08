/**
 * 裏路地の裏稼業のマスターデータ（GAME_DESIGN.md セクション4）。
 * 高報酬・低年齢コスト・牢屋/死のリスク（セクション3.2の逆相関）。
 * 追加はここに追記するだけで済む（CLAUDE.md アーキテクチャ原則3）。
 * 確率は success + jail + death = 1 になるように書く。
 * TODO: 数値はすべて仮置き。フェーズ5のバランス調整パスで見直す。
 */

export interface UnderworldJobDef {
  id: string;
  name: string;
  payMin: number;
  payMax: number;
  successChance: number;
  jailChance: number;
  /** 死亡確率は 1 - successChance - jailChance */
  ageCost: number;
  texts: {
    /** 成功時のログ */
    success: string;
    /** 捕まって牢屋行きのログ */
    jailed: string;
    /** 死亡時のログ（年齢が後ろに付く） */
    death: string;
  };
}

export const underworldJobs: UnderworldJobDef[] = [
  {
    id: 'courier',
    name: '運び屋',
    payMin: 40,
    payMax: 80,
    successChance: 0.75,
    jailChance: 0.2,
    ageCost: 0.1,
    texts: {
      success: '中身を訊かずに荷を届けた。それがこの稼業の作法だ。',
      jailed: '受け渡しの場所に衛兵が待っていた。売られたのだ。',
      death: '荷の中身を見てしまった。それだけの理由で、路地の暗がりがお前の終着点になった。',
    },
  },
  {
    id: 'intimidation',
    name: '脅しの片棒',
    payMin: 80,
    payMax: 150,
    successChance: 0.6,
    jailChance: 0.25,
    ageCost: 0.15,
    texts: {
      success: '借金取りの後ろで黙って立っていた。相手は払った。お前の取り分は悪くない。',
      jailed: '脅した相手が衛兵の身内だった。運が悪かった、で済む話ではなかった。',
      death: '脅した相手は、脅され慣れていた。懐から出たのはナイフだった。',
    },
  },
  {
    id: 'assassination',
    name: '暗殺の手伝い',
    payMin: 150,
    payMax: 300,
    successChance: 0.5,
    jailChance: 0.2,
    ageCost: 0.2,
    texts: {
      success: 'お前は見張りをしただけだ。悲鳴は一度だけ聞こえた。金は約束通り払われた。',
      jailed: '仕事は済んだが、口封じより先に衛兵が来た。それが幸運だったのかは分からない。',
      death: '標的の護衛は、雇い主の話より三人多かった。',
    },
  },
];
