# ドパドパタイピング

60秒のローマ字タイピング。打鍵ごとに音と演出が盛れる。ブラウザだけで完結する。

## 開発

```bash
npm install
npm run dev
```

http://localhost:5173/dopa-type/

## XServer への配置

公開URLは `https://games.furutahss.com/dopa-type/` 。Vite の `base` は `/dopa-type/`。

```bash
npm run build
```

`dist` の中身を、ドキュメントルートの `dopa-type` ディレクトリへアップロードする。`.htaccess` は隠しファイルなので、FTPでは隠しファイルの表示をオンにする。

`RewriteBase` も `/dopa-type/` を向いている。置き場所を変えるときは `vite.config.ts` の `base` と `public/.htaccess` を揃えてからビルドし直す。
