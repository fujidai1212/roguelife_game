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
    work: '日雇い労働',
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
    enter: '日雇いの仕事はいつでもある。安く、きつく、命の危険がないだけましな仕事が。',
    worked: (pay: number) => `荷運びで一日が潰れた。${pay}Gを得た。腰が痛い。`,
    choices: {
      labor: '一日働く',
      backToTown: '町に戻る',
    },
  },
  backToTown: '通りに戻った。',
} as const;
