# ADR-001: Proposal versionと承認を分離する

- Status: Accepted
- Date: 2026-08-24

## Context

条件変更と承認を同じversion列で表すと、確定条件ではない「承認版」が作られ、履歴とagreementの参照先が曖昧になる。

## Decision

`proposal_versions` は条件変更時だけ追加する。v1 夫 4,800円、v2 妻 2,000円、v3 夫 3,000円の場合、妻がv3を承認してもv4は作らない。承認は `responses` に保存し、`agreements.proposal_version_id` は承認対象のv3を参照する。

対案・再提案はチャットではなく正式なproposal versionとし、対案理由を必須にする。version番号はDB側で採番し、最新versionだけを回答対象とする。

## Consequences

条件履歴と回答履歴を独立して監査できる。承認RPCはresponse、agreement、request、calendar projection、audit logを同一transactionで更新する。
