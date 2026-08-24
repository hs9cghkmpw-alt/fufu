# ADR-007: 終日予定をdateで保持する

- Status: Accepted
- Date: 2026-08-24

## Context

終日予定を00:00のtimestampで表すと、timezone変換により前日・翌日へずれる可能性があり、日時予定との意味も混同する。

## Decision

時刻を持つ日時は `timestamptz`、終日予定は `date` を使う。終日を00:00の `timestamptz` で代用しない。基本timezoneは `Asia/Tokyo` とする。開始・終了のtimestamp列と開始・終了date列は排他的に使用し、DBのCHECK制約で整合性を保証する。

## Consequences

終日の意味をtimezoneから独立して保持できる。API、validation、calendar grouping、testは日時と終日を明示的に分岐する。
