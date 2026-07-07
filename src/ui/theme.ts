/**
 * UIテーマ。黒背景＋白文字基調のロートーン（CLAUDE.md UI方針）。
 * 色・余白・文字サイズはすべてここから参照する。直書き禁止。
 */

export const colors = {
  background: '#000000',
  surface: '#141414',
  border: '#3a3a3a',
  text: '#e8e8e8',
  textDim: '#8a8a8a',
  danger: '#b03a3a',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const fontSizes = {
  sm: 13,
  md: 15,
  lg: 18,
} as const;
