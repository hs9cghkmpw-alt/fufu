# Repository Working Agreement

## Source of truth

- `docs/spec/system-design-v1.2.md` をマスター仕様とする。
- `docs/decisions/` のADRを設計判断と理由の記録とする。仕様変更時は実装だけでなく仕様とADRも更新する。
- `main` はレビュー済みの安定版として扱う。Sprint 1以降の作業を、未レビューの前提で直接混ぜない。

## Architecture

- Feature-based architectureを維持する。機能コードは原則 `src/features/<feature>/`、横断的な再利用コードだけを `src/shared/` に置く。
- 巨大な `App.tsx` を作らない。routing、provider、featureを分離する。
- 巨大componentを作らない。表示、フォーム、データ取得、状態遷移の責務境界で小さく分割する。
- 状態遷移ロジックを複数画面・serviceへ重複させない。共有domain logicまたはDB RPCへ集約する。
- UIへ権限制御を重複実装しない。UIの表示制御は補助であり、認可の正本はRLS/RPCとする。
- DB/RLS/RPCの責務を分離する。DB制約は不変条件、RLSは行アクセス、RPCは重要な状態遷移・複数行更新・transactionを担当する。
- Realtimeは再取得のtriggerとしてのみ扱い、受信payloadを確定状態として信用しない。

## Security

- secret、service role key、token、実値入りenv fileをcommitしない。
- 操作者はclient入力ではなく `auth.uid()` から決定する。
- 業務tableは原則RLSを有効にし、重要操作とaudit logを同一transactionにする。
- 通常ユーザーにaudit logのUPDATE/DELETEを許可しない。

## Git and verification

- 作業開始前に対象branchを確認し、`git pull --ff-only` で最新化する。
- 作業終了前に `npm run verify`（PowerShellで必要なら `npm.cmd run verify`）を実行し、全項目をPASSさせる。
- force pushは禁止する。
- Git競合を勝手に解決しない。作業を停止し、競合箇所と必要な判断を報告する。
- 無関係な既存変更を編集、破棄、commitしない。

## Context / Token Safety — mandatory

- 全Agentは作業中、残りcontext/token余力と残作業量を継続的に確認または保守的に推定する。正確な残量を取得できない場合でも免除されない。
- context切れ・出力打切り・作業途中の情報喪失が起きそうな状態まで作業を続けてはいけない。危険域に入る前に安全なcheckpointを作り、変更をfeature branchへ保存できる範囲で保存し、Issue/PRまたは適切なSource of Truthへ `AI-HANDOFF` を残して交代する。
- `AI-HANDOFF` には必ず、目的、完了済み、未完了、branch/commit/PR/Issue、変更ファイル、tests/CI結果、blocker、次の具体的1〜3手、安全境界・触ってはいけない箇所、推測・未検証事項を含める。
- HANDOFF後に新しい大規模変更を始めない。次Agentは最新HANDOFFを最初に読み、重複作業をせず続きから再開する。
- トークンを限界まで使うことより、早めで完全な申し送りを優先する。
