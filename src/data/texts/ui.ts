/** 画面枠まわり（ステータス帯・場面名・システムメニュー）のテキスト */
export const uiTexts = {
  /** イラスト欄のプレースホルダーに出す場面名 */
  sceneNames: {
    creation: '生まれる前の暗闇',
    town: '町の大通り',
    tavern: '酒場',
    itemShop: '道具屋',
    work: '働き口',
    church: '教会',
    guild: '冒険者ギルド',
    alley: '裏路地',
    jail: '牢屋',
    dungeon: 'ダンジョン',
    camp: '野営地',
    combat: '戦闘',
    retreat: '帰り道',
    death: '人生の終わり',
  },
  statusLine: (hp: number, maxHp: number, gold: number, age: number, depth?: number) =>
    `HP ${hp}/${maxHp}　金 ${gold}G　${age.toFixed(1)}歳` +
    (depth !== undefined ? `　深度 ${depth}` : ''),
  statusLineEmpty: 'HP -/-　金 -G　年齢 -',
  resumed: '（前回の続きから再開した。）',
  systemLabels: {
    status: 'ステータス',
    pause: '中断',
    settings: '設定',
  },
  systemNotImplemented: (label: string) => `（${label}はまだ実装されていない。）`,
} as const;
