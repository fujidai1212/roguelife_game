import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { applyAction, newGame } from '../../core/actions';
import { parseSave, serializeSave } from '../../core/save';
import type { GameAction, GameState, LogEntry } from '../../core/types';
import { uiTexts } from '../../data/texts/ui';

/** AsyncStorage 上のセーブデータのキー */
const SAVE_KEY = 'save';
/** 画面に保持するログの上限行数（超えた分は古い順に捨てる） */
const MAX_LOG_ENTRIES = 200;

interface GameStore {
  /** ゲーム状態。起動直後の読み込み（hydrate）が終わるまで null */
  state: GameState | null;
  entries: LogEntry[];
  /** 起動時に一度だけ呼ぶ。セーブがあれば再開、なければ新規開始 */
  hydrate: () => Promise<void>;
  /** プレイヤーの選択をゲームに適用し、自動セーブする */
  dispatch: (action: GameAction) => void;
  /** ゲーム進行に影響しないシステムメッセージをログに足す */
  pushSystemMessage: (text: string) => void;
}

let nextLogId = 0;
const toEntries = (logs: string[]): LogEntry[] => logs.map((text) => ({ id: nextLogId++, text }));

function persist(state: GameState, entries: LogEntry[]): void {
  // 失敗してもゲームは続行できるので待たない（次の保存で上書きされる）
  void AsyncStorage.setItem(SAVE_KEY, serializeSave(state, entries));
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  entries: [],

  hydrate: async () => {
    if (get().state) return;
    const saved = await AsyncStorage.getItem(SAVE_KEY);
    const data = saved !== null ? parseSave(saved) : null;
    if (data) {
      // 復元したログとIDが衝突しないよう、採番を続きから始める
      nextLogId = data.logs.reduce((max, entry) => Math.max(max, entry.id + 1), 0);
      set({ state: data.state, entries: [...data.logs, ...toEntries([uiTexts.resumed])] });
      return;
    }
    const result = newGame(Date.now());
    const entries = toEntries(result.logs);
    set({ state: result.state, entries });
    persist(result.state, entries);
  },

  dispatch: (action) => {
    const current = get().state;
    if (!current) return;
    const result = applyAction(current, action);
    if (result.state === current && result.logs.length === 0) return; // 無効な操作は何もしない
    const entries = [...get().entries, ...toEntries(result.logs)].slice(-MAX_LOG_ENTRIES);
    set({ state: result.state, entries });
    persist(result.state, entries);
  },

  pushSystemMessage: (text) =>
    set((store) => ({ entries: [...store.entries, ...toEntries([text])].slice(-MAX_LOG_ENTRIES) })),
}));
