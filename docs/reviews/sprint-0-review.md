# Sprint 0 Review

実施日: 2026-08-23  
対象: Sprint 0「開発基盤構築」

## 結論

Sprint 0の完成条件を満たした。業務機能、業務テーブル、状態遷移RPCは後続Sprintの範囲として意図的に未実装としている。

## 実装範囲

- React 19 / TypeScript strict / Viteによるアプリ基盤
- React Routerと指定7ルートの仮画面
- feature-based構成と小さなApp Shell／page component
- Vitest + Testing Libraryによるunit/component test
- Playwright E2E設定、mobile/desktop project、app shell smoke test骨格
- Supabase client factory境界、ブラウザ公開可能環境変数のZod検証
- Supabase CLI設定、migration配置、生成DB型配置方針
- Vite PWA manifest、Service Worker、更新検知、offline表示
- mobile-first UI、320px最小幅、44px以上の操作領域、下部navigation
- Asia/Tokyo date utilityと境界日test
- GitHub Actions（verify、Playwright、gitleaks、dependency review）
- ローカルsecret scanと`npm audit --audit-level=high`

## 設計原則レビュー

- 夫婦は別Authアカウントとし、プロフィール切替を設けない方針をログイン仮画面と境界文書に反映した。
- `current_actor_user_id`をworkflow上の明示値とし、statusから推測しない方針を維持する。
- 条件変更のみ`proposal_versions`を増やし、承認イベントは`responses`、確定版は`agreements`へ保存する後続設計を変更していない。
- request workflowとagreement execution stateを分離する。
- `proposal_versions` / `agreements`を正本、`calendar_events`を投影とする。合意済み予定の直接編集を許さず、変更・取消RPCを経由する。
- 複雑なDB更新と監査ログは同一transactionのRPCへ集約し、UIから複数更新を直列実行しない。
- Realtimeは確定値ではなく再取得トリガーとして利用する。
- RLSは行アクセス、RPCは状態遷移・不変条件・transactionを担当する。
- service role／secretをfrontendへ配置しない。`.env.example`はpublishable keyのみを定義する。

## 検証結果

| 項目                   | 結果                                       |
| ---------------------- | ------------------------------------------ |
| dev server             | PASS（Vite ready 218ms、`/home` HTTP 200） |
| environment validation | PASS                                       |
| typecheck              | PASS                                       |
| lint                   | PASS（0 warnings）                         |
| formatter              | PASS                                       |
| unit/component tests   | PASS（2 files / 3 tests）                  |
| production build       | PASS                                       |
| PWA manifest           | PASS（`dist/manifest.webmanifest`）        |
| Service Worker         | PASS（`dist/sw.js`）                       |
| secret scan            | PASS                                       |
| dependency audit       | PASS（0 vulnerabilities）                  |
| `npm run verify`       | PASS                                       |

Playwrightのローカル実行には別途`npx playwright install chromium`が必要。GitHub Actionsはbrowser install後にE2E smoke testを実行する構成とした。

## 問題

未解決の重大問題: 0件。設計矛盾およびsecret混入は検出されなかった。
