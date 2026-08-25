# Sprint 4 Response Core Review

- Date: 2026-08-25
- Branch: `sprint-4-response-core`
- Result: PASS (local pgTAP runner excluded: Docker daemon unavailable)

## Implementation scope

最新proposalへの承認、却下、家で話すという3種類の正式回答を実装した。対案・再提案、agreement生成、話し合い結果登録、実行完了、calendar連携は対象外である。

## Schema

`responses`を追加し、request/couple、回答対象proposal、responder、response type、却下理由、話し合い日時、作成日時を保持する。`proposal_version_id`を固定するため、requestのcurrent versionが後に進んでも回答対象は変化しない。`requests.discussion_at`を追加し、話し合い予定の現在状態を一覧・詳細から参照できるようにした。

## Constraints and immutability

- proposal、request、coupleの複合FKにより、別requestまたは別coupleのproposalをresponseへ関連付けられない。
- `proposal_version_id` uniqueにより、同じproposalへ複数の確定responseを記録できない。
- response typeごとのpayload CHECKにより、approveは追加payloadなし、rejectはtrim済み1〜2000文字のreason必須、discussionは`discussion_at`必須とした。
- client direct write policyを設けず、BEFORE UPDATE/DELETE triggerでもresponse履歴の変更・削除を拒否する。

## RPC and transaction

`approve_request`、`reject_request`、`schedule_discussion`を追加した。内部の`lock_request_for_response`がrequest rowを`FOR UPDATE`し、次を検証する。

- actorは`auth.uid()`
- active couple memberかつ非archive couple
- `current_actor_user_id = auth.uid()`
- workflowが`pending_response`または`negotiating`
- `current_proposal_version = expected_version`
- DB上にlatest proposalが存在
- 対象proposalにresponseが未作成

各RPCはresponse INSERT、request status/current actor更新、common audit INSERTを同一transactionで行う。RPCは`SECURITY DEFINER`、`search_path = ''`で、public/anon executeを剥奪しauthenticatedのみに許可する。

## Expected version and concurrency

expected versionは全回答RPCで必須であり、不一致は`stale_request`として拒否する。request row lockにより同じrequestへの同時回答を直列化する。最初の回答がstatusとactorを終端状態へ更新するため、後続回答は成功できない。proposal単位uniqueも最終防御となる。実Supabase E2Eで同一requestへのapprove/reject同時実行が200/400の1件ずつとなり、responseが1件だけであることを確認した。

## Self-approval

current actor検証とは独立して、approve時にlatest proposalをDBから再取得し、`author_user_id = auth.uid()`なら`self_approval_forbidden`を返す。frontend入力のauthorやstatusを判定に使わない。

## Response behavior

- Approve: response type `approved`、request status `approved`、current actor null。agreementはまだ作成しない。
- Reject: response type `rejected`、必須reason、request status `rejected`、current actor null。
- Discussion: response type `discussion_scheduled`、必須`timestamptz`、request status `discussion_scheduled`、current actor null、request/response双方に日時を記録する。

## RLS and audit

responsesはRLS有効で、active couple memberだけが同じcoupleの行をSELECTできる。client direct INSERT/UPDATE/DELETEは禁止する。common `audit_logs`には`request_approved`、`request_rejected`、`discussion_scheduled`を重要操作と同一transactionで記録する。既存requests/proposal/audit RLSは変更していない。

## UI

`/requests/:id`でログインユーザーがcurrent actorの場合だけ「承認する」「却下する」「家で話す」を表示する。承認は確認段階を設け、却下は理由必須、家で話すは日時必須とした。stale errorでは「内容が更新されています。最新の状態を読み込みました。」と表示して詳細を再取得する。status表示は回答待ち、合意済み、却下、話し合い予定を日本語で表示する。

一覧は、あなたの対応が必要、相手の回答待ち、話し合い予定、最近の合意、最近の申請へ分類する。却下は最近の申請に残る。

## Tests

- Unit/component: 14 files / 31 tests PASS。action visibility、approve confirmation、reject form、discussion form、stale refresh/message、status表示を含む。
- pgTAP: `supabase/tests/response_core.test.sql`に29 assertionsを追加。approve/reject/discussion、stale、actor、audit、RLS、direct write、immutable、terminal、row lock、self-approval guardを対象とする。
- Remote E2E: Chromium 1 test PASS。A/B pair、A request、B UI approve、A/B approved表示、reject、discussion、別couple遮断、direct response mutation禁止、audit、stale、非current actor、同時approve/rejectを確認した。

## Security

actor、current actor、status、proposal author、proposal version、coupleをfrontend入力から信用しない。request row lock後にDB値を再検証する。他coupleのRPC操作は`request_not_found`として拒否し、存在を開示しない。responseとauditは通常ユーザーから変更・削除できない。

## Unresolved issues

- Docker daemon未起動のためローカルpgTAP runnerは未実行。migrationはlinked Supabaseへ正常適用済みで、主要項目はremote E2Eで検証した。
- Viteの500 kB超chunk warningは継続する。

## Next sprint concerns

対案・再提案ではexpected versionとrow lockを継続し、新proposal INSERT後にcurrent actorを相手へ移す。過去proposal/responseを更新しない。`discussion_scheduled`から話し合い結果を新proposalとして登録する際も、口頭合意を直接approvedへせず相手の正式承認を必要とする。agreement生成はresponseと分離し、導入時に既存approved responseから安全に確定版を参照する。
