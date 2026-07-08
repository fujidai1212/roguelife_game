/** 加齢・死など、人生の進行に関するテキスト */
export const lifeTexts = {
  aged: (age: number) => `誕生日など誰も祝わない。お前は${age}歳になった。`,
  decline: '体が軋む。老いは確実にお前を蝕んでいる。（力・素早さ・魔力・最大HPが下がった）',
  deathOldAge: (age: number) =>
    `ある朝、お前は起き上がれなかった。それだけのことだった。${age}歳の生涯だった。`,
  deathSummary: (gold: number) =>
    `残ったのは${gold}Gと、誰の記憶にも残らない名前だ。だが、魂は消えない。`,
  choices: {
    reincarnate: '来世へ',
  },
} as const;
