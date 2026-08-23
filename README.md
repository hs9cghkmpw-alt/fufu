# ふたりの約束

夫婦双方が同じルールで申請・対案・合意を行い、決定事項と次の対応を可視化するPWAです。現在はSprint 0（開発基盤）です。

## 開発

Node.js 22以上を利用します。

```sh
npm ci
npm run dev
npm run verify
```

Supabase接続が必要な場合だけ、`.env.example`を`.env.local`へコピーして公開可能な値を設定してください。設計原則と生成DB型の運用は `docs/architecture/sprint-0-foundation.md` を参照してください。
