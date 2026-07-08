/** 加齢・死など、人生の進行に関するテキスト */
export const lifeTexts = {
  aged: (age: number) => `誕生日など誰も祝わない。お前は${age}歳になった。`,
  decline: '体が軋む。老いは確実にお前を蝕んでいる。（力・素早さ・魔力・最大HPが下がった）',
  deathOldAge: (age: number) =>
    `ある朝、お前は起き上がれなかった。それだけのことだった。${age}歳の生涯だった。`,
  deathSummary: (gold: number) =>
    `残ったのは${gold}Gと、誰の記憶にも残らない名前だ。だが、魂は消えない。`,
  /** 最深部ボス撃破の大団円（GAME_DESIGN.md セクション8）。死ではなく人生の完結 */
  ending: (name: string, age: number) =>
    `${name}は動かない。本当に終わったのだ。お前は${age}歳で、誰も成し遂げなかったことを成し遂げた。` +
    `地上に戻ったお前の名は、初めて人々の記憶に刻まれた。物語は大団円で幕を閉じる。`,
  endingSummary: '英雄の生涯を終えた魂は、ひときわ強い光を放っている。',
  choices: {
    reincarnate: '来世へ',
  },
} as const;
