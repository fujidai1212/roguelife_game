/**
 * 裏路地の裏稼業のマスターデータ（GAME_DESIGN.md セクション4）。
 * 高報酬・低年齢コスト・牢屋/死のリスク（セクション3.2の逆相関）。
 * 追加はここに追記するだけで済む（CLAUDE.md アーキテクチャ原則3）。
 * 確率は success + jail + death = 1 になるように書く。
 * 数値を変えるときはセクション3.2の逆相関（危険なほど年齢コストが安い）を崩さないこと。
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
  {
    id: 'graveWatch',
    name: '墓荒らしの見張り',
    payMin: 60,
    payMax: 110,
    successChance: 0.7,
    jailChance: 0.22,
    ageCost: 0.12,
    texts: {
      success: '月のない夜、お前は口笛を吹かなかった。それが合図だ。掘り出した連中は気前が良かった。',
      jailed: '墓地の管理人は耳が良かった。衛兵はもっと早かった。',
      death: '墓を暴いた連中が最初に埋め直したのは、見張りのお前だった。',
    },
  },
];
