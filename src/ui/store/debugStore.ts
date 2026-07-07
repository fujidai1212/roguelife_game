import { create } from 'zustand';

import { createRng, type Rng } from '../../core/rng';
import type { LogEntry } from '../../core/types';
import { debugTexts } from '../../data/texts/debug';

/**
 * フェーズ0の動作確認用ストア（Zustand）。
 * 「選択肢を押す → ログが増える」の流れだけを実装する。本実装が進んだら置き換える。
 */

interface DebugStore {
  entries: LogEntry[];
  rng: Rng;
  tap: (choiceId: string) => void;
  tapSystem: (label: string) => void;
}

let nextId = 0;
const entry = (text: string): LogEntry => ({ id: nextId++, text });

export const useDebugStore = create<DebugStore>((set) => ({
  entries: [entry(debugTexts.opening)],
  rng: createRng(),
  tap: (choiceId) =>
    set((state) => {
      const text =
        choiceId === 'dice'
          ? debugTexts.results.dice(state.rng.int(1, 6))
          : debugTexts.results[choiceId as 'look' | 'shout' | 'sleep'];
      return { entries: [...state.entries, entry(text)] };
    }),
  tapSystem: (label) =>
    set((state) => ({
      entries: [...state.entries, entry(debugTexts.systemNotImplemented(label))],
    })),
}));
