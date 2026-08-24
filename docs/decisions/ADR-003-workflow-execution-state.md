# ADR-003: Request workflowとexecution stateを分離する

- Status: Accepted
- Date: 2026-08-24

## Context

申請交渉と合意後の実行を単一statusへ混在させると、次の対応者、終端判定、期限超過の意味が不明瞭になる。

## Decision

request workflowは `pending_response`、`negotiating`、`discussion_scheduled`、`approved`、`rejected`、`withdrawn`、`cancelled` とする。agreement execution stateは `not_required`、`pending`、`completed`、`cancelled` とする。`overdue` は期限とexecution stateから求める派生表示で、永続状態にしない。

`requests.current_actor_user_id` を明示的に保持し、statusから推測しない。`discussion_scheduled` は二人で話す予定である。話し合い後、どちらかが結果を新proposalとして登録し、登録者を `proposed_by`、もう一方を `current_actor_user_id` とする。

## Consequences

workflowと実行状況を独立して照会・拡張できる。状態遷移はRPCに集約し、UIに重複実装しない。
