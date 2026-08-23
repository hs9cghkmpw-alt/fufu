# Sprint 0 開発基盤

## 境界

- UIはfeature単位に配置し、複雑なDB更新はfeature serviceからRPCへ委譲する。
- ブラウザはpublishable keyのみを利用する。service role／secretはフロントへ置かない。
- Realtimeイベントはローカル状態の確定値ではなく、権限付きデータ再取得のトリガーとして扱う。
- 申請workflowと合意後のexecution stateは別モデルにする。
- `proposal_versions` / `agreements` が正本で、`calendar_events` は再構築可能な投影とする。
- 合意済み予定の変更・取消は専用RPCを通し、正本、投影、監査ログを同一transactionで更新する。

## DB型生成

Supabase CLIで生成し、`src/shared/lib/supabase/database.types.ts`へ配置します。業務型を同ファイルへ手書きで複製しません。

```sh
npx supabase gen types typescript --project-id <project-id> > src/shared/lib/supabase/database.types.ts
```

## 環境変数

`.env.example`を`.env.local`へコピーし、ブラウザ公開可能なURLとpublishable keyだけを設定します。未設定でもSprint 0の仮画面は起動しますが、Supabase client取得時には明示的に失敗します。
