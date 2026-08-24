# ADR-004: Calendarを正本からの物理projectionとする

- Status: Accepted
- Date: 2026-08-24

## Context

共有カレンダーには合意済み、話し合い、期限、未確定予定を効率よく表示する必要があるが、カレンダーを正本にすると合意履歴と食い違う。

## Decision

アプリ自身に共有カレンダーを持つ。正本は `proposal_versions` と `agreements`、`calendar_events` は再構築可能なprojectionとする。MVPでは未確定予定も物理projectionする。projection更新は関連RPCで正本・audit logと同一transactionに含める。

繰り返しは独立した `recurring_event` typeにせず、通常eventの `recurrence_series_id` で表現する。personal eventは本人だけSELECT/CRUD可能とし、相手はRLSでも取得できない。shared eventはMVPでは原則として相手承認を必須とする。

## Consequences

期間検索を効率化しつつ、projectionは正本から復元できる。合意由来eventの直接編集は禁止し、変更・取消RPCを使う。
