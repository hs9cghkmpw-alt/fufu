# Sprint 3 Request Core Review

- Date: 2026-08-25
- Branch: `sprint-3-request-core`
- Result: PASS (local pgTAP runner excluded: Docker daemon unavailable)

## Implementation scope

正式な合意レーンの新規申請作成、初回proposal v1、申請一覧、申請詳細を実装した。承認、却下、対案、再提案、家で話す、agreement、実行完了、変更・取消、calendar projectionは対象外である。共有予定と個人予定はrequestへ混在させていない。

## Schema

- `requests`: 案件ID、couple、request kind、workflow status、申請者、次の対応者、category、current proposal version、timestampsを保持する。
- `proposal_versions`: requestとcoupleの複合参照、version、author、title、details、整数円の金額、単発/月額、予定日時、期限、対案理由の拡張列を保持する。
- `audit_logs`: 今後の業務操作に共通利用できるactor、action、entity、request/proposal参照、metadata、発生日時を持つ追記式監査基盤である。

## Constraints

- request ID/couple/versionからproposalの同一couple・同一versionを参照する遅延複合FKにより、RPC transaction完了時のcurrent version整合を保証する。
- `(request_id, version_no)` uniqueによりv1重複と将来のversion重複を防ぐ。
- requestの申請者とcurrent actorは同一couple membershipへの複合FKを持ち、別人CHECKを持つ。triggerでactive membershipと非archive coupleも検証する。
- proposalのrequest/couple、author membership、v1 author=requester、version=current versionをDBで検証する。
- title、details、category、amount、amount typeをCHECKとRPCの双方で検証する。金額は`numeric(12,0)`の円単位で小数を許可しない。

## create_request RPC

`auth.uid()`からactorを取得し、active coupleを検索してcouple lockとadvisory transaction lockを取得する。active memberがちょうど2人であることを再検証し、自分以外のmemberをcurrent actorとしてDB側で決定する。request、proposal v1、2件のauditを同一transactionで作成してrequest IDだけを返す。clientはcouple、requester、author、current actor、versionを指定できない。

RPCは`SECURITY DEFINER`、`search_path = ''`であり、public/anon executeを剥奪しauthenticatedのみに許可する。

## Immutable proposal policy

client向けINSERT/UPDATE/DELETE policyを設けない。さらに全経路を対象とするBEFORE UPDATE/DELETE triggerで既存proposalの変更と削除を拒否する。条件変更は後続Sprintで新version INSERTとして実装する。

## current_actor decision

夫・妻等のrole labelやfrontend入力は使わず、actorと同じactive coupleに所属する、自分以外のactive memberをRPC内で決定する。active memberが2人揃わない場合は正式申請を作成しない。

## RLS

`requests`、`proposal_versions`、`audit_logs`でRLSを有効化した。`is_active_couple_member(couple_id)`を使用し、active memberだけが同じcoupleの行をSELECTできる。client direct write policyは設けず、正式作成はRPCに限定する。

## Common audit design

Sprint 3では`request_created`と`proposal_created`を同一transactionで記録する。actionを固定enumにせず長さ制約付きtextとしたため、対案、承認、却下、取消、完了、予定変更をmigrationでtable再構築せず追加できる。metadataはJSON objectに限定する。通常ユーザーはSELECTだけ可能で、UPDATE/DELETEできない。

## Future integration with pairing_audit_logs

既存`pairing_audit_logs`はSprint 2の監査証跡を維持するため削除・移行しない。将来はaction namingとmetadata schemaを確定した後、既存pairing履歴を保持したまま共通`audit_logs`へ新しいpairing eventを書き込む。必要なら両tableを時系列表示するread-only viewを移行期間に設け、検証後にappend-only migrationで過去イベントをbackfillする。履歴のUPDATE/DELETEによる統合は行わない。

## UI

- `/requests`: 「あなたの対応が必要」「相手の回答待ち」「最近の申請」をcurrent actorと申請者で分類する。
- `/requests/new`: title、category、任意金額、単発/月額、details、予定日時、期限を検証し、成功後に詳細へ遷移する。
- `/requests/:id`: 状態、title、category、金額、details、日時、申請者、次の対応者、v1、作成日時を表示する。意思決定操作は置かない。
- ユーザー文言は「相手に申請を送る」とし、上下関係を示す表現を避ける。

## Tests

- Unit/component: form validation、金額表示、form submit、一覧分類、loading/error、詳細表示を対象とする。
- DB/RPC/RLS: pgTAP 27 assertionsで作成、v1、actor、audit、RLS、direct write禁止、immutable、1人、archive、不正金額/category、couple整合、v1重複を対象とする。

## E2E

実Supabaseへmigrationを適用し、Request専用Chromium E2E 1件がPASSした。A/B signup・pairing、Aのrequest作成、A側の相手回答待ち、B側の要対応、v1内容、requester/author/current actor、共通audit、direct request/proposal write禁止、proposal UPDATE/DELETE禁止、audit UPDATE禁止、不正金額/category、1人couple拒否、別coupleからのrequest/proposal/audit 0件を確認した。既存Pairing統合E2Eの再実行ではPlaywright APIRequestContextに一時的なTLS `EPROTO`が発生したため、Request専用E2Eはブラウザ内fetchで同等のremote assertionsを行った。

## Security

actorと所属情報はclient入力を信用せず、`auth.uid()`とDB membershipから決定する。全業務tableはRLS有効、direct write禁止、auditは重要操作と同一transaction、proposal履歴はtriggerでも変更禁止である。secret/service role keyはfrontendへ追加していない。

## Concurrency and consistency

couple単位advisory transaction lockとcouple row lockの後にmember数とarchive状態を再検証する。requestとv1は単一transactionで作成し、current proposal複合FKをdeferred評価するため部分成功はcommitできない。unique制約が同一request/versionの重複を拒否する。後続の回答・対案RPCではexpected versionを必須にする。

## Unresolved issues

- ローカルpgTAP実行にはDocker Desktopまたは互換daemonが必要。
- Viteの500 kB超chunk warningは継続する。
- archived couple拒否はpgTAPに含むが、ローカルDocker daemon未起動のため今回のrunnerでは未実行。migration trigger/RPCとremote schemaへの正常適用は確認済み。

## Sprint 4 concerns

承認・却下は`current_actor_user_id`とexpected versionをrow lock後に検証する。最新proposal authorの自己承認を拒否し、response、request状態、将来agreement、auditを同一transactionで更新する。古い画面の操作は競合として拒否し、UIに再取得理由を表示する。
