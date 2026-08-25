# 実用化前に必ず検討実装する事項

この文書は今後のSprint planningで参照する。

## 高優先

### 1. Pairing解除再Pairing

- 誤ったアカウント同士をPairingした場合の復旧
- 一方的な直接削除ではなく正式な解除方式
- 履歴を消さない
- 将来的な再Pairingを可能にする

### 2. 同時操作競合制御

- 古いproposalへの承認を拒否
- optimistic locking / expected version
- row lock / transaction
- UIでも競合理由を説明
- stale状態を確定操作として扱わない

### 3. 共通監査ログ

- pairing専用auditから、申請、対案、承認、取消、完了、予定変更等を追跡できる共通audit設計を検討
- 重要操作と同一transaction
- 通常ユーザーのUPDATE/DELETE禁止

### 4. UX過負荷防止

アプリを「何でも承認が必要なアプリ」にしない。

以下の3レーンを維持する。

#### A. 正式な申請合意

- お金
- 購入
- 約束
- 条件変更
- 取消
- 後で揉める可能性がある事項

#### B. 共有スケジュール

- 病院
- 外出
- 家族予定
- 必ずしも重い承認フローを必要としない予定

#### C. 個人スケジュール

- 本人のみ
- 相手承認不要
- 相手からRLSでも見えない

## 中優先

### 5. 通知

- 新規申請
- 対案
- 対応待ち
- 期限
- 未実行
- 将来的なWeb Push

### 6. アカウント復旧

- 機種変更
- メールアドレス変更
- パスワード再設定
- ログイン不能
- 誤アカウント作成時の復旧

### 7. Offline UX

- 閲覧は可能
- 正式な承認、対案、変更操作はサーバー成功後のみ確定
- offline queueで重要操作を勝手に後送しない
- stale dataを最新状態として扱わない

## 本番化前

### 8. Backup / Export

- JSON / CSV / PDF等で履歴出力
- データ消失時の復旧方針
- 退会、全削除方針

### 9. Production Auth

- email confirmation方針
- 本番callback URL
- password reset URL
- 開発用Auth設定を本番へ持ち込まない

### 10. Deployment

- HTTPS常時公開
- PWAインストール
- iPhone双方から常時利用可能
- Supabase本番設定

### 11. Performance

- Vite 500kB超chunk warning
- route lazy loading
- code splitting
- 必要時に対応
