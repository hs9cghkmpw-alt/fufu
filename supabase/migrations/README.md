# Migrations

Supabase CLIが生成する時系列SQLをこのディレクトリで管理します。業務状態を変更するRPCは、状態検証、正本更新、投影更新、監査ログ追加を同一トランザクション内で行います。Sprint 0では業務スキーマを作成しません。

適用済みmigrationは編集せず、新しいmigrationを追加してください。`proposal_versions` と `agreements` を正本、`calendar_events` を投影として扱う原則はmigrationでも維持します。
