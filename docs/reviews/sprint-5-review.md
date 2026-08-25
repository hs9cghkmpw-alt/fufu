# Sprint 5 Review: Negotiation Core

## Implementation scope

正式申請レーンに、対案・再提案（v2/v3/...）、話し合い結果登録、取下げ、proposal履歴表示を追加した。agreement生成、実行管理、calendar projection、change/cancellationは対象外である。

## Schema and constraints

- `proposal_versions`は既存行を更新・削除せず、条件変更ごとに次versionをINSERTする。
- `requests.current_proposal_version`のdeferred複合FK、request内version unique、proposal/request/couple複合FKを維持した。
- Sprint 3の`requester != current_actor`制約は、v2作成後にrequesterが次のactorになる正式交渉と矛盾したため廃止した。代わりに、commit時に「current actor != latest proposal author」を検証するdeferred constraint triggerを追加した。
- v2以降の`counter_reason`はRPCでtrim後1〜2000文字を必須とする。title/category/amount/detailsもfrontendとDBの両方で検証する。
- 金額は既存どおり`numeric(12,0)`を使い、nullまたは0以上999,999,999,999以下の整数に限定する。

## RPC and transaction behavior

### `counter_proposal`

`auth.uid()`、active couple、current actor、回答可能status、expected version、latest proposal authorをDB側で検証する。request行を`FOR UPDATE`し、next version採番、request更新、proposal INSERT、audit INSERTを同一transactionで実施する。次のactorはactive couple内の作成者以外のmemberである。

### `record_discussion_result`

`discussion_scheduled`の案件に対し、active memberのどちらかが結果を新proposalとして登録できる。登録だけではapprovedにせず、statusを`negotiating`、current actorを登録者の相手にして正式承認を待つ。既存`discussion_at`とdiscussion responseは履歴として保持する。

### `withdraw_request`

初回requesterだけが`pending_response`または`negotiating`を、expected version一致時に取下げられる。proposal/responseは削除せず、statusを`withdrawn`、current actorをnullにする。

すべての公開RPCは`SECURITY DEFINER`、`search_path = ''`、fully-qualified table参照とし、`public`/`anon`からexecuteをrevokeして`authenticated`だけへgrantした。

## Response model decision

対案は`responses`へ`countered`として二重記録せず、新しい`proposal_versions`行そのものを正式イベントとした。理由とauthorは新versionに一意に保持される。`responses`は承認・却下・話し合い予約を対象proposalへ固定する役割を維持し、最終承認はv3を直接参照する。承認によるv4は作成しない。

## Concurrency and consistency

- 重要RPCはrequest行を`FOR UPDATE`する。
- `expected_version`不一致は`stale_request`で失敗する。
- row lock取得後にlatest proposalとactorを再確認する。
- 同時counterは一方のtransactionだけがv1からv2へ進み、もう一方はstaleになる。
- request current version更新とproposal/audit INSERTは同一transactionであり、deferred FKをcommit時に検証する。
- proposal UPDATE/DELETE禁止triggerとdirect writeを許さないRLSを維持した。

## Audit

common `audit_logs`へ、同一transaction内で以下を記録する。

- `proposal_countered`
- `proposal_reproposed`
- `discussion_result_recorded`
- `request_withdrawn`

初回requesterが新versionを出した場合をreproposal、それ以外をcounterとして区別する。Pairing専用`pairing_audit_logs`は移行せず、将来は共通action/entity/metadataモデルへ変換して統合する方針を維持する。

## RLS and security

新しい業務tableは追加していない。既存requests/proposal_versions/responses/audit_logsのactive couple限定SELECTと、client direct INSERT/UPDATE/DELETE禁止を維持した。他coupleからの履歴取得とRPC操作は拒否される。actor/couple/version/authorをfrontend入力として受け取らない。

## UI

- current actorに「条件を変えて提案する」を表示し、現在proposalを初期値にしてvN+1を作成する。
- v1から最新までauthor、title、amount、details、変更理由、作成日時を昇順表示し、現在proposalを明示する。
- `discussion_scheduled`では双方に話し合い結果登録を表示する。
- requesterには回答待ち・交渉中だけ取下げ導線を表示する。
- stale時は再取得し「内容が更新されています。最新の提案を確認してください。」と説明する。
- negotiatingはcurrent actorに応じて「あなたの対応が必要」「相手の回答待ち」へ入り、withdrawnは履歴側に残る。

## Tests

### DB/RPC/RLS

`supabase/tests/negotiation_core.test.sql`に35 assertionsを追加した。v1 4800円 → v2 2000円 → v3 3000円 → v3承認、author/actor交互、reason必須、stale、取下げ、話し合い結果、他couple不可、audit、row lockを検証する。

ローカルpgTAPはDocker/Postgres（127.0.0.1:54322）が起動しておらず実行できなかった。migrationはlinked Supabaseへdry-run後に適用済みで、実DB typesを再生成した。

### Unit/component

対案フォーム初期値・理由必須、proposal履歴とcurrent強調、action visibility、話し合い結果、取下げ確認、withdrawn表示を追加し、既存response/list/detail testsも維持した。

### Remote E2E

実Supabase上でA/B pair、A v1 4800円、B v2 2000円、A v3 3000円、B v3承認、履歴3件、approved responseがv3参照、v4なしを確認した。話し合い結果登録、取下げ、同時counterの一方のみ成功、別coupleから0件も同じ代表シナリオで確認した。

## Unresolved issues

- ローカルpgTAPはDocker daemon/ローカルDB未起動のため未実行。remote E2Eで主要RPC/RLS経路はPASSしている。
- Viteの500kB超chunk warningは継続している。production-readinessに従いroute lazy loading/code splittingを本番化前に検討する。

## Sprint 6 concerns

- approved時のagreement生成は、approved responseが指すproposal versionを固定して同一transactionで作成する。
- agreement導入時も承認でproposal versionを増やさない。
- calendar projectionを追加する場合、proposal/agreement/auditと同じRPC transaction内で同期し、proposalを正本とする。
- discussion result後に残る`discussion_at`は履歴表示用であり、今後calendar eventの完了/履歴化ルールを定義する必要がある。
