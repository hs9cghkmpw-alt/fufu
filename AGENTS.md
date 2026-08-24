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
