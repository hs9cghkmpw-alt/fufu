# Sprint 7 Calendar Core 実装計画

## 目的

アプリ内共有カレンダーを実用レベルへ進める。正式合意・提案・話し合いの正本は既存の request / proposal / response / agreement とし、calendar_events は検索・表示用の projection とする。

## 不変条件

- agreement / proposal / response が正本。calendar projection から正式合意内容を直接変更しない。
- personal event は owner 本人だけが RLS 経由でも閲覧できる。
- couple event は active couple member だけが閲覧できる。
- agreement / discussion / pending proposal projection は client direct mutation を禁止する。
- actor / owner / couple は client 入力を信用せず auth.uid() と active membership から確定する。
- timed event は timestamptz、終日予定は date を使用し 00:00 timestamptz で代用しない。
- Realtime payload を正本として扱わない。

## calendar_events 案

- id uuid PK
- couple_id uuid nullable
- owner_user_id uuid nullable
- event_type text
  - agreement
  - discussion
  - pending_proposal
  - shared
  - personal
- visibility text
  - couple
  - personal
- title text
- details text nullable
- starts_at timestamptz nullable
- ends_at timestamptz nullable
- start_date date nullable
- end_date date nullable
- source_request_id uuid nullable
- source_proposal_version_id uuid nullable
- source_agreement_id uuid nullable
- source_response_id uuid nullable
- created_by uuid
- created_at timestamptz
- updated_at timestamptz
- cancelled_at timestamptz nullable

CHECK 制約で timed と all-day の同時保持を禁止し、visibility=personal のとき owner_user_id 必須/couple_id null、visibility=couple のとき couple_id 必須を保証する。

## Projection 方針

### Agreement

approve_request transaction 内で agreement 作成後に projection を同期する。scheduled_at または due_at がある場合に calendar_event を生成する。source_agreement_id を unique にして二重生成を防止する。

### Discussion

schedule_discussion transaction 内で discussion event を upsert する。record_discussion_result 後は projection を cancelled/完了相当として一覧上の現在予定から外し、response/request の履歴は保持する。

### Pending proposal

scheduled_at / due_at を持つ pending_response / negotiating の latest proposal のみを projection する。counter で version が進んだ場合は旧projectionを現在表示から外し新versionへ差し替える。reject / withdraw / approve 時にも同一transactionで整合を保つ。

## Direct event

### Personal

create_personal_event RPC を用意する。owner=auth.uid()、couple_id=null。SELECT/編集/取消は本人だけ。

### Shared

Production readiness の「何でも正式申請にしない」方針を守り、正式 request とは別レーンとする。ただし master spec v1.2 の shared event 原則承認必須を優先するため、MVPでは shared event を即確定させず shared event request/approval の軽量フローを検討する。Sprint 7で複雑化する場合は personal + projection を優先完成し、shared direct event は明示的BLOCKED/TODOとして残す。

## UI

/calendar

- 月移動
- 今日へ戻る
- 日付選択
- 選択日のイベント一覧
- イベント種別を文字＋アイコンで区別
- 「予定を追加」から個人予定/共有予定を選択
- agreement由来eventは「合意から作成された予定」と表示し agreement/request へ遷移
- projection由来eventは編集不可

## Test 最低条件

- personal A は A のみ取得、B は0件
- other couple は couple event 0件
- agreement approve で projection 1件
- discussion scheduling で projection生成
- counter/reject/withdraw/approve に伴う pending projection 整合
- projection direct mutation不可
- all-day date と timed timestamptz の整合
- calendar month/day UI
- source link
- 実Supabase E2Eで personal隔離 + agreement/discussion projection

## 完了条件

- migration
- RLS/RPC
- projection transaction integration
- calendar feature 分割
- generated DB types 更新
- unit/component tests
- remote E2E
- npm run verify PASS
- docs/reviews/sprint-7-review.md

## 既知の非ブロッカー

- ローカル pgTAP runner は Docker/Postgres daemon がない環境では未実行となる可能性がある。
- Vite 500kB超 chunk warning は production-readiness の本番化項目で対応する。
