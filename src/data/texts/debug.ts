/**
 * フェーズ0の動作確認用ダミーテキスト。
 * ゲーム内テキストはすべて src/data/texts/ に置く（CLAUDE.md コーディング規約）。
 * 本実装が進んだら削除する。
 */

export const debugTexts = {
  opening: 'お前は目を覚ました。ここがどこかは分からない。分かるのは、金がないことだけだ。',
  choices: {
    look: '辺りを見回す',
    shout: '叫ぶ',
    sleep: 'もう一度眠る',
    dice: 'ダイスを振る',
  },
  results: {
    look: '見回しても何もない。石の壁と、冷えた空気だけだ。',
    shout: '叫んだ。誰も来ない。喉が痛くなっただけだ。',
    sleep: '眠ろうとした。眠れなかった。時間だけが過ぎた。',
    dice: (value: number) => `ダイスを振った。出目は ${value}。だから何だ、という目だ。`,
  },
  systemNotImplemented: (label: string) => `（「${label}」は未実装だ。今は何も起こらない。）`,
} as const;
