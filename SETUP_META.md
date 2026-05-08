# STEP 1: Meta開発者登録 〜 Threads APIトークン取得までの完全手順

所要時間: 30〜60分。Threads APIは「Meta(Facebook)の開発者アカウントを作って → アプリを作って → Threadsアカウントと連携して → トークンを発行する」という4段階です。順番にやれば必ずできます。

---

## 0. 事前準備

- **Threadsアカウント** が公開設定で投稿に使えること(@yourname)
- **Facebookアカウント** が必要(Threadsの裏側で必須)。なければ https://www.facebook.com/ で作成
- **スマホ** にThreadsアプリを入れておく(連携確認で使用)

---

## 1. Meta for Developers にログイン

1. https://developers.facebook.com/ を開く
2. 右上 **「ログイン」** → 普段使いのFacebookアカウントでログイン
3. 初回は開発者登録(同意 + 電話番号認証 + 用途選択)を求められる:
   - 用途: 「**自分用 / その他**」
   - 役割: 「**開発者**」

---

## 2. アプリを作成

1. 右上 **「マイアプリ」** → **「アプリを作成」**
2. **「ユースケース」** で → **「Threads APIにアクセス」** を選択 → 「次へ」
   - もし表示されなければ「**その他**」→ 次画面で「**ビジネス**」を選択
3. アプリ名: `threads-auto-poster` (任意の名前でOK)
4. 連絡先メール: 自動入力されたものでOK
5. **「アプリを作成」** をクリック

---

## 3. Threads プロダクトを追加

1. アプリのダッシュボードが開く
2. 左メニュー or 中央のカード一覧から **「Threads」** を探す → **「設定」** ボタン
3. これで Threads API が使えるようになる

---

## 4. アプリ設定の確認

左メニュー → **「アプリの設定」** → **「ベーシック」**

ここで以下をメモしておく:
- **アプリID** (15桁ぐらいの数字)
- **app secret** (右の「表示」を押すとパスワード再入力後に表示。**絶対にどこにも貼らないこと**)

---

## 5. Threads API の権限設定

左メニュー → **「Threads」** → **「ユースケース」** or **「アクセス許可」**

以下の権限が **追加されている** ことを確認(無ければ「追加」):

| 権限 | 用途 |
|---|---|
| `threads_basic` | 基本情報の取得 |
| `threads_content_publish` | **投稿の公開(必須)** |

---

## 6. リダイレクトURL を設定

Threads → **「設定」** タブ:

- **「Redirect Callback URLs」** に **`https://localhost/`** を入力 → 保存
  - (本格運用しないなら何でもいい。ただしHTTPS必須)

---

## 7. 短期アクセストークンを取得

Threads → **「ユーザートークン生成」** ボタン:

1. 「**Threadsアカウントを追加**」 → ご自身のThreadsアカウントを選択して連携承認
2. 権限選択画面で `threads_basic` `threads_content_publish` の両方にチェック
3. **「アクセストークンを生成」** をクリック
4. 表示された **長い文字列(短期トークン、1〜2時間で切れる)** をコピー

⚠️ ここで一度メモ帳にコピペしておく。次の手順ですぐ使う。

---

## 8. 短期トークン → 長期トークン(60日)に変換

Macのターミナルを開いて、以下を実行(`YOUR_APP_SECRET`と`SHORT_LIVED_TOKEN`を実際の値に置き換え):

```bash
curl -G "https://graph.threads.net/access_token" \
  --data-urlencode "grant_type=th_exchange_token" \
  --data-urlencode "client_secret=YOUR_APP_SECRET" \
  --data-urlencode "access_token=SHORT_LIVED_TOKEN"
```

レスポンス例:
```json
{
  "access_token": "THAA0xxxxxxxxxxxxxxx...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

この `access_token` の値が **長期アクセストークン**。これが `THREADS_ACCESS_TOKEN` の値です。

---

## 9. ご自身の Threads ユーザーIDを取得

```bash
curl "https://graph.threads.net/v1.0/me?fields=id,username&access_token=YOUR_LONG_LIVED_TOKEN"
```

レスポンス:
```json
{
  "id": "1234567890123456",
  "username": "your_username"
}
```

この `id` の値が `THREADS_USER_ID`。

---

## 10. 取得した値の整理

最終的に手元に揃うのはこの2つ:

| 名前 | 例 | 使い道 |
|---|---|---|
| `THREADS_ACCESS_TOKEN` | `THAA0xxxxx...` | GitHub Secrets に登録 |
| `THREADS_USER_ID` | `1234567890123456` | GitHub Secrets に登録 |

これで STEP 1 完了。**次は STEP 2(GitHub設定とSecrets登録)に進む** → [README.md](README.md) の「クラウド自動運用セットアップ」セクションへ。

---

## トラブルシューティング

### 「Threads」プロダクトが選択肢に出ない
- アプリタイプが「ビジネス」になっているか確認
- それでも出ない → アカウントを別ブラウザでログインし直す

### `client_secret` を忘れた
- 「アプリの設定」→「ベーシック」→ app secret の「表示」で再表示可能(リセットも可)

### トークンが `Invalid OAuth access token` で弾かれる
- 短期トークンを長期化せず使っている可能性大 → STEP 8 をやり直し
- もしくは権限不足 → STEP 5 で `threads_content_publish` が入っているか確認

### 60日経ってトークンが切れた
- STEP 7〜8 をもう一度やる(手動更新が必要)
- 自動更新したい場合は、長期トークンを使ってrefresh APIを叩く別スクリプトを後で追加可能(必要になったら相談を)
