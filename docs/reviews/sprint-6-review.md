# Sprint 6 Review: Agreement / Execution / Home Core

## Implementation scope

承認済みrequestをagreementとして固定し、execution state、完了記録、期限超過派生表示、実用Home、合意一覧・詳細、最低限の履歴画面を実装した。calendar projection、change/cancellation、担当者指定、完了相互承認は対象外である。

## Agreement schema

`agreements`は以下を固定する。

- `source_request_id`
- `source_proposal_version_id`
- `approved_response_id`
- lifecycle state（active/superseded/cancelled）
- execution state（not_required/pending/completed/cancelled）
- scheduled/due snapshot
- completed timestamp/user
- 将来変更用`superseded_by`、取消用`cancelled_at`

request、proposal、response、coupleの複合FKにより別案件・別coupleの誤関連を拒否する。new requestは`source_request_id` unique、approved responseもuniqueで二重agreementを防ぐ。既存approved requestはmigration内でapproved responseが指すproposalからbackfillし、`agreement_created` auditも補完した。

## Approval transaction

`approve_request`を拡張した。既存のrequest `FOR UPDATE`、expected version、current actor、latest proposal、自己承認禁止を維持し、approved response、agreement、request approved更新、`request_approved` audit、`agreement_created` auditを同一transactionで行う。承認では新proposal versionを作らず、agreementはapproved responseが指すlatest proposalを固定する。

## Execution model

request workflowとagreement executionをADR-003どおり分離した。互換defaultは、確定proposalに`scheduled_at`または`due_at`があれば`pending`、両方なければ`not_required`とした。proposal内容から用途を過剰推測せず、将来create request UIで明示選択へ拡張できる。

`complete_agreement(agreement_id, expected_execution_status)`はagreement行を`FOR UPDATE`し、active couple member、lifecycle active、expected state=`pending`を検証する。成功時は`completed`、`completed_at`、`completed_by_user_id`、`agreement_completed` auditを同一transactionで保存する。片方の完了記録で完了するMVP方針である。

## Execution events decision

専用`execution_events`は追加しなかった。Sprint 6では完了イベントが1種類だけであり、agreementのcompleted fieldsと共通`audit_logs`に同じ事実を三重保存する利点が小さいためである。再開、部分実行、繰り返しoccurrence等が必要になった時点で追記式execution eventを導入する。

## Overdue definition

`overdue`は永続statusに追加しない。`execution_status = pending`かつ`due_at < now`の場合だけ派生表示を「期限超過・未実行」とする。現在schemaの期限は`timestamptz`のみなのでtimestamp経過直後から期限超過となる。将来date-only期限を追加する場合はADR-007に従いAsia/Tokyo翌日00:00を境界にする。

## RLS and security

agreementsはRLS ONで、active couple memberだけSELECTできる。client direct INSERT/UPDATE/DELETE policyは付与せず、approve/completeの`SECURITY DEFINER` RPCだけが書き込む。RPCは`search_path = ''`、fully-qualified参照、`auth.uid()` actor、authenticated execute限定である。他coupleはagreementを0件として扱い、completeも`agreement_not_found`になる。

## Concurrency and consistency

- approveはrequest row lockとresponse/agreement uniqueで二重成立を防ぐ。
- completeはagreement row lockとexpected execution stateで同時完了の片方だけを成功させる。
- proposal/response/agreementの複合FKで承認対象を固定する。
- transaction途中失敗時はresponse、agreement、request、auditの部分状態を残さない。
- proposal immutabilityと自己承認禁止を維持する。

## UI

- `/requests/:id`のapproved案件に確定proposal version、合意内容、合意日時、実行状態、必要時の完了操作を表示する。
- `/agreements`と`/agreements/:id`を追加し、合意一覧・詳細へ分離した。
- agreement、execution、homeのservice/hook/component/pageをfeature単位で分離した。

## Home

`/home`を次の順序で表示する。

1. あなたの対応が必要
2. 未実行・期限超過
3. 今日・近日の予定（7日以内）
4. 相手の回答待ち
5. 話し合い予定
6. 最近の合意

Home serviceはRLS付きrequests/agreements queryを組み合わせ、current actor、workflow、execution、scheduled/dueから分類する。Realtime payloadは利用していない。

## History

`/history` placeholderを置換し、approved/rejected/withdrawn requestとcompleted agreementを確認可能にした。本格的なaudit filter UIは今後の対象である。

## Tests

### DB/RPC/RLS

`agreement_execution_core.test.sql`に24 assertionsを追加し、agreement自動生成、proposal/response固定、pending初期化、二重agreement、direct write、完了actor/time、二重完了、他couple隔離、RLS、row lock、auditを検証する。Negotiation pgTAPもv3 agreement参照と一意性を追加して37 assertionsとした。

ローカルpgTAPはDocker/Postgres未起動の場合は実行できない。migrationはlinked Supabaseへdry-run後に適用し、remote schemaからDatabase typesを再生成した。

### Unit/component

Home 6セクション順・分類、期限超過派生、agreement v3表示、execution pending/completed、complete action、history sectionsを追加し、既存request/response/negotiation testsも維持した。

### Remote E2E

実SupabaseでA/B pair、v1→v2→v3、v3承認、agreementがv3/approved responseを参照、Home最近の合意・期限超過、同時completeの一方だけ成功、completed表示、Home期限超過から消えること、他couple agreement 0件を代表シナリオで確認した。

## Unresolved issues

- Vite 500kB超chunk warningは継続する。route lazy loading/code splittingをproduction-readinessに従い本番化前に対応する。
- execution_requiredの明示入力UIは未導入。Sprint 6ではscheduled/dueの有無による安全な互換defaultを使用する。
- date-only execution期限は未導入。導入時はAsia/Tokyo境界をDB/Frontendで共通化する。

## Next sprint concerns

- calendar projectionを追加する場合、agreement/proposalを正本としapprove/complete/auditと同一transactionで更新する。
- change/cancellationでは旧agreementを直接編集せず、新request承認後にsuperseded/cancelled lifecycleへ遷移する。
- execution担当者、繰り返し実行、部分完了を導入する場合はexecution_events/occurrencesの必要性を再評価する。
