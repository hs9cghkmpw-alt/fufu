# ADR-002: 最新proposalの作成者による自己承認を禁止する

- Status: Accepted
- Date: 2026-08-24

## Context

交渉では初回申請者と最新条件の提示者が一致しないため、初回申請者基準では自己承認を正しく防げない。

## Decision

承認者 `auth.uid()` と、承認対象である最新 `proposal_versions.proposed_by` が同じ場合は承認を拒否する。初回申請者 `requests.created_by` は判定に使わない。加えて承認者は `requests.current_actor_user_id` と一致しなければならない。

## Consequences

対案を提示した側が自分の条件を確定できない。不変条件はUIではなく承認RPCで保証し、競合時は再取得を要求する。
