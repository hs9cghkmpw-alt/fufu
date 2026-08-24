# Sprint 2 Pairing Review

- Date: 2026-08-24
- Branch: `sprint-2-pairing`
- Supabase project: `jebnziosmlmmhefwbvif`
- Result: PASS

## 実装内容

認証済みの別ユーザー2人が、対等なメンバーとして1つの夫婦スペースを共有するPairing機能を実装した。対象はspace作成、招待発行・取消、招待参加、pairing状態取得、route誘導、pairing操作監査であり、申請・承認・agreement・calendar本実装は含めていない。

## DB schema

- `couples`: space本体、作成者、作成日時、archive日時。`created_by` は監査情報であり権限差を作らない。
- `couple_members`: spaceとAuth userの所属、表示専用`role_label`、参加・離脱日時。
- `couple_invitations`: SHA-256 hash、発行者、有効期限、使用・取消状態。平文列なし。
- `pairing_audit_logs`: couple作成、招待発行・取消、join成功の追記式履歴。

## Indexes / constraints

- `couple_members_one_active_per_user`: `left_at is null`の部分unique indexにより1 user 1 active coupleを保証。
- `couple_members_unique_history`: 同一user/coupleの重複membershipを禁止。
- `enforce_couple_member_capacity_before_insert`: couple UUID単位のtransaction advisory lockを取得するtrigger。全insert経路でactive memberを最大2人に制限し、同時insertを直列化。
- active membership、active invitation、audit時系列用indexを追加。
- invitationの使用日時/userの組、使用済みと取消済みの排他、期限順序をCHECK制約で保証。

## RPC一覧

- `create_couple()`: `auth.uid()`をcreator/first memberとし、監査と同一transactionで作成。
- `create_couple_invitation(target_couple_id, valid_for default 24 hours)`: 旧active招待を取消し、暗号学的乱数を発行。
- `revoke_couple_invitation(target_invitation_id)`: 未使用招待を取消。
- `join_couple(invite_code)`: hash照合、状態・membership・capacityを再検証し、join・招待使用・監査を同一transactionで更新。

全RPCは`SECURITY DEFINER`、`search_path = ''`固定、actorは`auth.uid()`、`anon`/`public`からexecuteを剥奪し`authenticated`だけへgrantした。

## Race condition対策

`join_couple`は招待行を`FOR UPDATE`し、actor単位advisory lock、couple行lockの順で検証する。さらにmembership BEFORE INSERT triggerがcouple単位advisory lockを取得してcapacityを再検証する。部分unique indexが別coupleへの同時joinも最終的に拒否する。同一コードへの同時join実E2Eでは1件だけ成功し、active memberは2人のままであることを確認した。

## Invitation hashing方式

`extensions.gen_random_bytes(18)`による144-bit乱数を36桁hexとして一度だけRPC応答で返し、DBには`extensions.digest(code, 'sha256')`の`bytea`だけを保存する。default expiryは24時間、許容範囲は1分から7日。使用後・取消後・期限後はjoin不可。

## RLS policy

- `couples`、`couple_members`、`couple_invitations`、`pairing_audit_logs`はRLS有効。
- `is_active_couple_member()`を基準に、active memberだけが同じcoupleの行をSELECT可能。
- client向けINSERT/UPDATE/DELETE policyは設けず、membership・invitation状態・auditの直接変更を禁止。
- 実Supabaseで別coupleのcouple/memberが0件、direct membership INSERTが403、`used_by` direct updateが0件であることを確認。

## Pairing UI / Authとの接続

`PairingProvider`がAuth確定後にactive membershipとmember一覧を再取得する。loading/error/retry状態を持ち、未所属の`/home`アクセスは`/setup`へ誘導する。未所属ではspace作成と招待参加、1人所属では招待コード・期限・相手待ち、2人所属では完了とhome導線を表示する。roleによる管理者表現やプロフィール切替はない。Realtimeは採用せず、明示的な再取得を正本とした。

## Test結果

- Unit/Component: 7 files / 14 tests PASS（setup states、invitation form/error、route guard、error mappingを含む）。
- DB/RPC/RLS: 実Supabase Pairing suite 1 PASS。create/join、self/revoked/expired/used、同時join、3人目、二重所属、他couple RLS、direct writes、auditを確認。
- pgTAP: `supabase/tests/pairing.test.sql`に27 assertionsを用意。現環境はDocker Desktop未導入のためCLI runnerを起動できず、同等項目を実Supabase E2Eで実行した。
- E2E: Auth回帰2 PASS、Pairing 1 PASS。mobile側のremote mutation重複3件はrate-limit保護のためskip。

## Security確認

- invite code平文DB保存なし: PASS
- frontendのsecret/service roleなし: PASS
- actorを`auth.uid()`から決定: PASS
- direct membership INSERT / invitation update禁止: PASS
- concurrent join / 3人目 / 二重membership防止: PASS
- 他coupleアクセス防止: PASS
- SECURITY DEFINER search_path / execute最小化: PASS
- pairing auditを重要操作と同一transactionで追記: PASS

## 未解決事項

- 機能上・セキュリティ上の未解決事項は0件。
- ローカルpgTAP runnerにはDocker Desktopまたは互換Docker daemonが必要。
- Viteの500 kB超chunk warningは継続。Sprint 2受入条件への影響はない。

## Sprint 3への懸念

Sprint 3の業務tableは必ず`couple_id`を保持し、`is_active_couple_member()`または同等のRLSを適用する必要がある。重要な状態遷移はclient direct writeにせず、pairingと同じRPC・transaction・audit方針を維持する。

## 次の推奨作業

Sprint 3開始前にDocker対応CIでpgTAP 27 assertionsを常時実行し、request schema/RLS/RPCをマスター仕様とADRに沿って設計する。
