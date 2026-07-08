# HANDOVER.md — 開発引き継ぎ資料

前任の Claude（Fable 5）から後任への引き継ぎ資料。2026年7月8日時点。
まず `CLAUDE.md` → `docs/GAME_DESIGN.md` → `docs/ROADMAP.md` を読んでから本書を読むこと。

---

## 1. 現在地: フェーズ0〜5 完了、次はフェーズ6

ROADMAP のフェーズ0（土台）〜フェーズ5（ボスとv1ゴール、バランス調整パス）まで
実装・テスト・push 済み。**次の作業はフェーズ6（画像組み込みと仕上げ）。**

フェーズ5で入ったもの（2026年7月8日）:
- 中ボス（深度4ごと）と最深部ボス（深度10）。ボス深度のフロアは終点が
  野営地の代わりにボスノードになる（`floorTerminalKind`）。中ボス撃破で
  その場が野営地に、最深部ボス撃破で大団円（`deathCause: 'victory'`、精算ティア4）。
- レガシーに `statBonus` 効果（最大HP・力などの永続補正）。これが周回の実質的な成長軸。
- バランス検証スクリプト `npm run simulate`（`scripts/simulate.ts`、tsx で実行）。
  調整の根拠: 周回シミュレーション100回全てでボス撃破に到達、
  撃破までの人生数は最短4 / 中央値7 / 最長9（完了条件「数回〜十数回」を満たす）。
  **balance.ts / jobs.ts / enemies.ts の数値を変えたら必ず simulate で再検証すること。**

フェーズ6に着手する際の留意点:
- `docs/ASSET_LIST.md` はまだ存在しない。CLAUDE.md の画像アセット方針
  （共通スタイル指定文・黒背景非透過前提・リサイズスクリプト）に従って最初に作るとよい。
- タイトル画面・統計画面・効果音・アイコンもフェーズ6の範囲（ROADMAP参照）。

## 2. これまでの主な仕様変更（GAME_DESIGN.md に反映済み）

初期仕様から大きく変わった点。古い前提でコードを読むと混乱するので注意:

1. **時間システム**: 「日数」は廃止。**年齢そのものがコスト資源**
   （行動ごとに小数の年齢を支払う。セクション3）。誕生日（整数年齢）を
   越えるたびに衰え・老衰死を判定する（`src/core/aging.ts` の `advanceAge`）。
2. **キャラ作成**: 18歳固定・ステータス振り直しは3回まで。年齢ロールは存在しない。
3. **ダンジョン**: 「8つの未探索地点」方式から **Slay the Spire 的な分岐マップ**に変更
   （セクション5）。フロアは内部的にノードグラフとして生成するが**プレイヤーには
   見せない**。進行選択肢は最大3つ＋気配テキスト。道具・引き返す等は常設ボタン
   （画面下部の帯）に置く。
4. **職業の解放**: 「解放コスト(魂)」は**魂を消費して解放**と解釈して実装した
   （ユーザーに明示して異論なし）。

## 3. アーキテクチャの要点（CLAUDE.md の原則＋実装での具体化）

- すべての進行は `applyAction(state, action) => { state, logs }`（`src/core/actions.ts`）。
  **乱数の状態も GameState に含まれる**ため完全に決定的。テストはこれを利用している。
- `applyAction` は内部で `applyActionInner` を呼んだ後、**人生終了フック**
  （`settleIfLifeEnded`）を通す。生存→死亡/引退に変わった瞬間に魂精算・メタ更新・
  レガシー解放判定が自動で走る。**死亡処理を追加するときは自分で精算を書かないこと**
  （alive を false にすれば共通フックが拾う）。
- アクションハンドラはドメインごとに分割済み:
  - `actions.ts` … ディスパッチ＋キャラ作成・町の基本
  - `townActions.ts` … 盗み・牢屋・裏稼業・ギャンブル・クエスト
  - `dungeonActions.ts` … 探索・遭遇・野営・帰還
  - `combatActions.ts` … 戦闘コマンド
  - 共有ヘルパーは `helpers.ts`（`requireLife` / `noop` / `payAge` / `commit` /
    `stealSuccessChance`）
- **年齢コストの支払いは必ず `payAge()` を使う**（老衰死時にダンジョン・戦闘状態を
  片付けてくれる）。HPダメージは `combat.ts` の `applyDamageToPlayer()`（死亡処理込み）。
- UIは `getChoices(state)` / `getPersistentActions(state)`（`src/core/choices.ts`）が
  返す選択肢を表示して action を投げるだけ。**UI側にロジックを書かないこと。**
- セーブは2キー構成（`src/core/save.ts`, `src/ui/store/gameStore.ts`）:
  - `save`（人生全体, SAVE_VERSION=6）… 壊れたら新規開始
  - `meta`（魂・アンロック・統計, META_SAVE_VERSION=1）… 人生セーブが読めなくても残る。
    メタに新フィールドを足すときはバージョンを上げず `parseMeta` で0補完する
    （魂を失わせないため。フェーズ5のボス撃破数がその例）。
  - **GameState の形を変えたら SAVE_VERSION を+1**（旧セーブは意図的に捨てる設計）。

## 4. 作業の進め方（ユーザーとの合意事項・習慣）

- **仕様変更はまず GAME_DESIGN.md を更新してから実装**（本文書の変更履歴もその順）。
- 仕様の曖昧さ・矛盾は勝手に決めず質問する。ただし数値は仮置きOK（TODOコメント）。
- フェーズ開始時に「やること」を箇条書きで宣言。完了時に「何ができたか」と
  **スマホでの動作確認手順**を具体的に日本語で報告する（ユーザーは開発初心者）。
- コミットは1機能1コミット・日本語メッセージ。フェーズ内でも数コミットに分ける。
- 検証の定型: `npm test` → `npm run typecheck` → `npm run lint` →
  `npx expo export --platform android --output-dir <scratchpad>`（バンドル確認）。
- 動作確認は Expo Go（ユーザーのスマホ）。`npx expo start` の QR コード方式。

## 5. GitHub

- リモート: `https://github.com/fujidai1212/roguelife_game.git`（origin / master ブランチ）。
  ※ ユーザーが最初に伝えてきた URL（roguelife.git）は存在しない。リポジトリ名は
  `roguelife_game` が正。
- 認証: `gh` CLI・SSH鍵は**ない**。`/home/f2311192/.claude.json` 内の
  `GITHUB_PERSONAL_ACCESS_TOKEN`（fine-grained、Contents: Read and write 付与済み）を使う。
  push の定型（トークンを画面に出さないこと）:
  ```bash
  TOKEN=$(grep -o '"GITHUB_PERSONAL_ACCESS_TOKEN"[: ]*"[^"]*"' ~/.claude.json | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
  git -c credential.helper= \
      -c credential.helper='!f() { echo "username=x-access-token"; echo "password='"$TOKEN"'"; }; f' \
      push 2>&1 | sed "s/$TOKEN/<TOKEN>/g"
  ```
- 各フェーズ完了時に push する習慣になっている。

## 6. テストの書き方（既存の流儀）

- `src/core/__tests__/` に12ファイル・111件。`npm test`（vitest）。
- 決定的テスト: 同じシードで `newGame(seed)` → `applyAction` を連ねる。
- 確率分岐のテスト: `townRisk.test.ts` の `outcomesOverSeeds()` パターン
  （多数シードで実行し、観測された結果の集合を検証）。
- 任意の状態を作るときはテスト内で `GameState` を直接組み立てる
  （`makeState` ヘルパー各所にあり）。LifeState の必須フィールドは
  `kills` / `midBossKills` / `bossKills` / `maxDepth` / `bonusSouls` を忘れがちなので注意。
- 統合テストの自動プレイヤー: `dungeonFlow.test.ts` の `walkToCamp()`
  （新しい pendingEvent を追加したらここにも分岐を足すこと）。

## 7. 未実装・保留・既知の注意点

- **武器屋・防具屋**: 未実装（「未実装」表示）。装備システム自体がどのフェーズにも
  ないため、ROADMAP フェーズ4の「武器屋・防具屋の盗み」は道具屋・行商人の盗みで
  代替した（ユーザーに報告済み・異論なし）。装備を入れるなら仕様の追記から。
- **教会の回復・呪い解除**: 未実装（教会は引退のみ）。呪いの概念もまだない。
- **バランス**: フェーズ5で `npm run simulate` の結果を根拠に調整済み。
  ただしシミュレーションの自動プレイヤーはダンジョン攻略中心で、
  盗み・裏稼業・ギャンブルの収支は通っていない（そこは机上の確認のみ）。
  数値を変えるときは simulate で再検証すること。
- **スキルの見え方**: 剣士はスキルなし、盗賊はパッシブのみ（戦闘ボタンが出ないのが
  仕様）。一度「不具合では」と誤解されたので、職業選択時に説明ログを出すようにした。
  新スキル追加時も「見えない仕様」には説明を添えること。
- **ログの丁寧さ**: プレイヤーに見える文字列は必ず `src/data/texts/` 経由
  （裏稼業・クエスト等のマスターデータ内テキストは items/enemies の name と同じ扱いで例外）。
  トーンは「ダークで乾いた、突き放す文体・二人称『お前』」。固有名詞はなろう系汎用語彙。
- **画像**: まだ1枚も支給されていない。全てプレースホルダー
  （`IllustrationView` が場面名を表示）。`docs/ASSET_LIST.md` は**まだ存在しない**。
  フェーズ6で作る予定だが、CLAUDE.md は随時管理を求めているので、早めに作るとよい。

## 8. 直近のフェーズ6でやること（ROADMAP より）

1. `docs/ASSET_LIST.md` の最終化（全画像のGeminiプロンプト案つき。共通スタイル指定文を冒頭に）
2. 支給画像の組み込み（未支給分はプレースホルダーのまま出せる設計を維持）
3. タイトル画面、統計画面（累計死亡数、最高深度、最長生存年数など）
4. 効果音（フリー素材 or 無音でも成立するUI設計）
5. アプリアイコン・スプラッシュ

完了条件: 画像が入った状態で一通りプレイでき、見た目のトーンが統一されている。
注意: 統計画面の「最長生存年数」は MetaState にまだ無い（追加するなら parseMeta の0補完方式で）。
