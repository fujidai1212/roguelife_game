import type { DungeonNodeKind } from '../../core/types';

/** ダンジョン・戦闘・野営・帰還のテキスト */
export const dungeonTexts = {
  enter: (depth: number) =>
    `ダンジョンに足を踏み入れた。深度${depth}。光はすぐに背後で途切れた。ここから先、道は自分で選ぶしかない。`,
  /**
   * 進行選択肢に出す「気配」テキスト。確定情報は出さない（GAME_DESIGN.md セクション5）。
   * generic はどのノードにも使う。byKind は内容をうっすら匂わせる程度に留めること。
   */
  hints: {
    generic: [
      '暗がりが続いている',
      '冷たい風が流れてくる',
      '足元に水たまりがある',
      '静かすぎる道',
      '天井から滴る音がする',
      '崩れかけた通路',
      '苔むした石段',
      '闇が濃い',
    ],
    byKind: {
      entrance: ['入口の明かりが遠い'],
      empty: ['何の気配もない', 'ただ暗いだけの道'],
      enemy: ['何かの息づかいがする', '生臭い風が吹く', '床に爪痕がある'],
      chest: ['奥で何かが鈍く光った', '人の通った跡がある'],
      fountain: ['水の音が聞こえる', '湿った空気が流れてくる'],
      camp: ['焚き火の匂いがかすかにする', '灰の匂いがする'],
    } satisfies Record<DungeonNodeKind, string[]>,
  },
  arrive: {
    empty: [
      '何もない空間だった。お前の足音だけが響く。',
      '誰かの荷物の残骸が散らばっている。使えるものはない。',
      '骨が転がっている。誰のものかは考えないことにした。',
    ],
    enemy: (name: string) => `暗がりから${name}が現れた。逃げ場はない。`,
    chest: '宝箱がある。誰が置いたのか、なぜここにあるのか。考えても答えは出ない。',
    fountain: '泉がある。澄んでいるように見える。毒の泉も、同じように澄んで見えるという。',
    camp: '野営地を見つけた。焚き火の跡がある。ここなら眠れる。このフロアの探索はここまでだ。',
  },
  chest: {
    opened: (gold: number) => `宝箱を開けた。${gold}Gが入っていた。`,
    trap: (damage: number) => `罠だ。仕掛けられた針がお前を貫いた。（${damage}のダメージ）`,
    left: '宝箱には手を触れず、通り過ぎた。賢明かどうかは分からない。',
    choices: { open: '開ける', leave: '立ち去る' },
  },
  fountain: {
    healed: (amount: number) => `泉の水を飲んだ。体に力が戻る。（HPが${amount}回復した）`,
    poisoned: (damage: number) => `泉の水を飲んだ。喉が焼ける。毒だ。（${damage}のダメージ）`,
    left: '泉には口をつけなかった。喉の渇きより命が惜しい。',
    choices: { drink: '飲む', leave: '立ち去る' },
  },
  camp: {
    slept: (depth: number) =>
      `焚き火のそばで眠った。目覚めると、体は勝手に深みへ向かっていた。深度${depth}。`,
    rested: (amount: number) => `焚き火のそばで休んだ。（HPが${amount}回復した）`,
    choices: { sleep: '眠って深く潜る', rest: '休息する（回復のみ）' },
  },
  retreat: {
    start: (floors: number) => `来た道を引き返すことにした。地上まで${floors}フロア。帰り道にも敵はいる。`,
    step: (floorsLeft: number) => `フロアをひとつ遡った。地上まであと${floorsLeft}フロア。`,
    ambush: (name: string) => `帰り道を${name}が塞いでいる。`,
    arrived: '地上に出た。日の光が目に刺さる。生きて戻った。それだけで上出来だ。',
    choices: { step: (floorsLeft: number) => `さらに引き返す（残り${floorsLeft}）` },
  },
  combat: {
    playerHit: (name: string, damage: number) => `お前の一撃が${name}に入った。（${damage}のダメージ）`,
    enemyHit: (name: string, damage: number) => `${name}の攻撃を受けた。（${damage}のダメージ）`,
    win: (name: string, gold: number) => `${name}は動かなくなった。${gold}Gを剥ぎ取った。`,
    fleeSuccess: '戦いを捨てて走った。恥は死より軽い。',
    fleeFail: '逃げ損ねた。背中は無防備だった。',
    itemUsed: (itemName: string) => `${itemName}を使った。`,
    noItems: '袋の中は空だ。',
    choices: {
      attack: '攻撃',
      items: 'アイテム',
      flee: '逃走',
      back: '戻る',
    },
  },
  useItem: {
    healed: (itemName: string, amount: number) => `${itemName}を使った。（HPが${amount}回復した）`,
    returned: '帰還の巻物が光に包まれ、気づけば町の門の前に立っていた。',
  },
  death: {
    battle: (name: string, age: number) =>
      `${name}の一撃が、お前の最後の記憶になった。${age}歳。冒険者の死としてはありふれている。`,
    trap: (age: number) => `罠の毒が全身に回った。誰にも看取られず、お前は${age}歳で終わった。`,
    poison: (age: number) => `泉のそばに、お前は${age}歳で横たわった。次の冒険者への警告として。`,
  },
  persistent: {
    useItem: (itemName: string, count: number) => `${itemName}（${count}）`,
    retreat: '歩いて引き返す',
  },
} as const;
