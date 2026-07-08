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
    enter: '酒場は薄暗く、饐えた匂いがする。誰もお前を見ない。それがこの店の礼儀だ。奥のテーブルではカードが、さらに奥では回転式の銃が回っている。',
    rumorHeard: (rumor: string, price: number) => `${price}Gで安酒を頼んだ。隣の男が呟く。${rumor}`,
    noMoney: '「金のない奴に話すことはない」カウンターの奥から、そう言われた。',
    cards: {
      win: (payout: number) => `カードはお前に味方した。${payout}Gをかき集める。`,
      lose: (bet: number) => `カードは嘘をつかない。${bet}Gがテーブルの向こうに消えた。`,
      noMoney: '「金を見せてから座れ」ディーラーは札を切る手を止めない。',
    },
    roulette: {
      survive: (payout: number) =>
        `撃鉄が落ちる。空音。テーブルがどよめき、${payout}Gが押し出された。生きている。`,
      death: (age: number) =>
        `撃鉄が落ちる。それがお前の聞いた最後の音だった。${age}歳。誰も驚かなかった。`,
      noMoney: '「命は賭け金にならん。金を持ってこい」',
    },
    choices: {
      rumor: (price: number) => `噂を聞く（${price}G）`,
      cards: (bet: number) => `カード賭博（${bet}G）`,
      roulette: (bet: number) => `ロシアンルーレット（${bet}G）`,
      leave: '店を出る',
    },
  },
  shop: {
    enter: '道具屋の親父は、お前の財布を値踏みするように見た。',
    bought: (name: string, price: number) => `${name}を買った。${price}Gが消えた。`,
    noMoney: (name: string) => `${name}に手を伸ばしたが、金が足りない。親父は鼻で笑った。`,
    stealSuccess: (name: string) => `親父が目を離した隙に、${name}が袖の中に消えた。心臓が鳴っている。`,
    stealCaughtJail: '手首を掴まれた。「衛兵！」──次に見た天井は、牢屋のものだった。',
    stealCaughtFight: '手首を掴まれた。店の奥から用心棒が立ち上がる。',
    choices: {
      buy: (name: string, price: number) => `${name}（${price}G）`,
      steal: (name: string) => `${name}を盗む`,
      leave: '店を出る',
    },
  },
  alley: {
    enter: '裏路地は昼でも暗い。壁にもたれた男が、顎でお前を呼んだ。「仕事か？ 選べ」',
    paid: (pay: number) => `懐に${pay}G。どこから来た金かは、考えない。`,
    choices: {
      job: (name: string, payMin: number, payMax: number) => `${name}（${payMin}〜${payMax}G）`,
      leave: '通りに戻る',
    },
  },
  jail: {
    enter: '石の床、鉄の格子、遠くで誰かの咳。牢屋だ。選べる道は多くない。',
    served: (years: number) =>
      `${years}年。数えるのをやめた頃に、扉が開いた。「出ろ」それだけだった。`,
    escapeSuccess: '夜、緩んだ格子を抜けた。心臓の音より静かに、お前は塀の外にいた。',
    escapeDeath: (age: number) =>
      `塀の上で、松明に照らされた。看守の槍は正確だった。${age}歳。脱獄者の墓は掘られない。`,
    choices: {
      serve: (years: number) => `刑期を務める（${years}年）`,
      escape: '脱獄を試みる',
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
  church: {
    enter: '教会は静かで、蝋燭の匂いがする。神は何も言わない。だがここでなら、この人生を終わらせることができる。',
    choices: {
      retire: '引退を申し出る',
      leave: '町に戻る',
    },
  },
  guild: {
    enter: '冒険者ギルドは埃っぽい。受付嬢は書類から目を上げずに、掲示板を指差した。',
    questOffered: (offer: string) => `掲示板の依頼書にはこうある。${offer}`,
    questAccepted: (name: string) => `「${name}」を受けた。受付嬢は判を押しただけだった。`,
    questProgress: (name: string, progress: number, count: number) =>
      `受注中:「${name}」（${progress}/${count}）`,
    questGatherProgress: (name: string, owned: number, count: number) =>
      `受注中:「${name}」（手持ち ${owned}/${count}）`,
    questComplete: (name: string, reward: number) =>
      `「${name}」の達成を報告した。${reward}Gが無造作にカウンターへ置かれた。`,
    questNotDone: '「達成してから来い」受付嬢は書類に目を戻した。',
    choices: {
      accept: (name: string) => `依頼を受ける（${name}）`,
      report: '達成を報告する',
      retire: '冒険者を辞める',
      leave: '町に戻る',
    },
  },
  retire: {
    ask: '「本当に終わりにするのか」。この人生は二度と戻らない。だが魂は、少しだけ多く残るだろう。',
    cancel: 'お前はまだ、終わりを選ばなかった。',
    done: (age: number) =>
      `お前は${age}歳で引退した。武器を置き、誰にも知られず余生を過ごし──やがて静かに消えた。`,
    choices: {
      confirm: '終わりにする',
      cancel: 'やめる',
    },
  },
  backToTown: '通りに戻った。',
} as const;
