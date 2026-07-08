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
      trash: ['饐えた匂いがする', '何かが積まれている影が見える'],
      merchant: ['小さな明かりが揺れている', '金属の触れ合う音がする'],
      trap: ['床の色が違う気がする', '空気が張りつめている'],
      camp: ['焚き火の匂いがかすかにする', '灰の匂いがする'],
      midBoss: ['巨大な何かの気配がする', '低い唸りが石壁を震わせている'],
      boss: ['この先の闇は、質が違う', '空気そのものが重い。最深部だ'],
    } satisfies Record<DungeonNodeKind, string[]>,
  },
  arrive: {
    empty: [
      '何もない空間だった。お前の足音だけが響く。',
      '誰かの荷物の残骸が散らばっている。使えるものはない。',
      '骨が転がっている。誰のものかは考えないことにした。',
    ],
    enemy: (name: string) => `暗がりから${name}が現れた。逃げ場はない。`,
    rareEnemy: (name: string) => `暗がりで何かが黄金色に光った。${name}だ。逃すには惜しい獲物だが──硬いぞ。`,
    chest: '宝箱がある。誰が置いたのか、なぜここにあるのか。考えても答えは出ない。',
    fountain: '泉がある。澄んでいるように見える。毒の泉も、同じように澄んで見えるという。',
    trash: 'ゴミの山だ。先人たちの成れの果てか。何か埋もれているかもしれない。',
    merchant: 'ランタンの下に行商人が座っていた。「いらっしゃい。ここの相場は、地上とは違うよ」',
    camp: '野営地を見つけた。焚き火の跡がある。ここなら眠れる。このフロアの探索はここまでだ。',
    midBoss: (name: string) =>
      `広間の奥で、${name}がこちらを見ていた。ここの主だ。こいつを越えなければ、先はない。`,
    boss: (name: string) =>
      `最深部。積み上がった骨の山の向こうで、${name}が目を開けた。ここまで来た者の名を、誰も知らない。`,
  },
  boss: {
    midDefeated: (name: string) =>
      `${name}は崩れ落ちた。広間に静寂が戻る。今夜は、ここの主はお前だ。`,
    challengePrompt: '奥で、あれはまだ待っている。',
    choices: { challenge: '再び挑む' },
  },
  trash: {
    foundItem: (name: string) => `ゴミの山から${name}が出てきた。前の持ち主のことは考えない。`,
    nothing: '漁ったが、ゴミはゴミだった。手が汚れただけだ。',
    hurt: (damage: number) => `腐った何かに触れた。指先から毒が這い上がる。（${damage}のダメージ）`,
    left: 'ゴミの山には触れなかった。賢明な判断かもしれないし、惜しいことをしたのかもしれない。',
    choices: { dig: '漁る', leave: '立ち去る' },
  },
  merchant: {
    bought: (name: string, price: number) => `${name}を${price}Gで買った。命の値段は場所で変わる。`,
    noMoney: '「金が足りないね。ここはツケが利く場所じゃない」',
    stealSuccess: (name: string) => `行商人が荷を整える隙に、${name}を掠め取った。`,
    stealCaught: '手が伸びた瞬間、闇から用心棒が現れた。「見てたよ」',
    left: '「またおいで。生きていれば、だけどね」',
    choices: {
      buy: (name: string, price: number) => `${name}（${price}G）`,
      steal: '盗む',
      leave: '立ち去る',
    },
  },
  floorTrap: {
    avoided: '足元で何かが鳴った。反射的に跳んだ。石の矢がお前のいた場所を貫いていった。',
    hit: (damage: number) => `床が沈んだ。石の矢がお前を貫く。（${damage}のダメージ）`,
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
    magicHit: (name: string, damage: number) =>
      `放った魔力が${name}を焼いた。防御など意味がない。（${damage}のダメージ）`,
    selfHealed: (amount: number) => `祈りが傷を塞いだ。（HPが${amount}回復した）`,
    enemyHit: (name: string, damage: number) => `${name}の攻撃を受けた。（${damage}のダメージ）`,
    win: (name: string, gold: number) => `${name}は動かなくなった。${gold}Gを剥ぎ取った。`,
    rareBonus: (souls: number) =>
      `金色の残滓が、体を素通りして魂に染み込んだ。（魂ボーナス+${souls}）`,
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
