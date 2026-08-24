# ADR-005: 変更・取消を履歴付きrequestとして扱う

- Status: Accepted
- Date: 2026-08-24

## Context

確定agreementを直接更新・削除すると、何に合意し、後から何が変わったかを追跡できない。

## Decision

`requests.request_kind` に `new`、`change`、`cancellation` を持たせる。変更・取消requestでは `target_agreement_id` を必須とする。変更承認時は新agreementを作成し、旧agreementを `superseded` にする。取消承認時は対象agreementを `cancelled` にする。履歴は削除しない。

## Consequences

変更・取消にも通常のproposal、承認、自己承認禁止、監査が適用される。正本、projection、audit logの変更は専用RPCの同一transactionで行う。
