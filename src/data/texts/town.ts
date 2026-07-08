/** 町・施設のテキスト */
export const townTexts = {
  hub: '町の雑踏の中にいる。誰もお前を気にかけない。どこへ行く。',
  notImplemented: '（ここはまだ実装されていない。扉は固く閉ざされている。）',
  destLabels: {
    guild: '冒険者ギルド',
    tavern: '酒場',
    weaponShop: '武器屋・防具屋',
    itemShop: '道具屋',
    alley: '裏路地',
    work: '労働',
    church: '教会',
    dungeon: 'ダンジョン入口',
  },
  tavern: {
    enter: '酒場は薄暗く、饐えた匂いがする。誰もお前を見ない。それがこの店の礼儀だ。',
    rumorHeard: (rumor: string, price: number) => `${price}Gで安酒を頼んだ。隣の男が呟く。${rumor}`,
    noMoney: '「金のない奴に話すことはない」カウンターの奥から、そう言われた。',
    choices: {
      rumor: (price: number) => `噂を聞く（${price}G）`,
      leave: '店を出る',
    },
  },
  shop: {
    enter: '道具屋の親父は、お前の財布を値踏みするように見た。',
    bought: (name: string, price: number) => `${name}を買った。${price}Gが消えた。`,
    noMoney: (name: string) => `${name}に手を伸ばしたが、金が足りない。親父は鼻で笑った。`,
    choices: {
      buy: (name: string, price: number) => `${name}（${price}G）`,
      leave: '店を出る',
    },
  },
  work: {
    enter:
      '仕事はいつでもある。安く、きつく、命の危険がないだけましな仕事が。人生の何年かを差し出せば、金にはなる。',
    worked: (years: number, pay: number) =>
      `働いた。気づけば${years}年が過ぎていた。手元には${pay}G。失った時間は戻らない。`,
    choices: {
      labor: (years: number) => `${years}年働く`,
      backToTown: '町に戻る',
    },
  },
  backToTown: '通りに戻った。',
} as const;
