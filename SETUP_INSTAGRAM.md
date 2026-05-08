# SETUP_INSTAGRAM.md — Instagram自動投稿のセットアップ手順

ThreadsのSETUP_META.mdを完了済みである前提です。Threadsアプリと **同じMeta開発者アプリ** にInstagramを追加する形で進めます。所要約60〜90分。

> **Facebookページについて**: Instagram Graph APIの仕様上、Facebookページとの紐付けが技術的に必須です。ただし **作るだけで運用は不要なダミーページでOK**。普段のFacebook運用は一切発生しません。詳細は Phase A-2 を参照してください。

---

## 全体像

```
[Phase A] Instagram側の状態を整える (15分)
  └─ プロアカウント化 → Facebookページ作成 → 紐付け

[Phase B] Meta開発者アプリにInstagramを追加 (15分)
  └─ Instagram Graph API プロダクト追加 + 権限設定

[Phase C] アクセストークン取得 (15分)
  └─ Graph API Explorer で長期トークン生成

[Phase D] Instagram Business Account ID 取得 (10分)
  └─ curl コマンドで取得

[Phase E] GitHub Secrets に登録 (5分)
```

---

## Phase A: Instagramアカウントの準備

### A-1. プロアカウントに切り替え

Instagram **アプリ** で(ブラウザではなくスマホアプリ推奨):

1. プロフィール画面 → 右上の **三本線メニュー**
2. **「設定とプライバシー」**
3. **「アカウントの種類とツール」** → **「プロアカウントに切り替える」**
4. カテゴリ選択 → **「建築デザイナー」** や **「建築サービス」** など適切なものを選択
5. **「ビジネス」** または **「クリエイター」** を選ぶ → どちらでも投稿APIは使える(クリエイターのほうが見た目シンプル)

### A-2. Facebookページを作成(ダミーでOK)

⚠️ **重要**: このFacebookページは **Instagram Graph API の仕様上、技術的な「土台」として必要なだけ** です。実際にFacebookで運用する必要は一切ありません:
- 投稿しなくていい
- フォロワーを集めなくていい
- 公開設定でも非公開でも、誰にも見せなくていい
- 後で消したくならない限り、二度と触らないただの「箱」

すでに自分の建築事務所のFacebookページがあるならそれを使ってOK。なければ以下で作成:

1. https://www.facebook.com/pages/create を開く(PC推奨)
2. **「ページ名」**: 「○○建築設計事務所」など(後で変更可、ダミーなら適当でも可)
3. **「カテゴリ」**: 「建築設計事務所」
4. **「ページを作成」** クリック
5. (任意)**ページの公開範囲を絞っておく**:
   - ページ管理画面 → 設定 → プライバシー → **「ページを公開」をオフ** にすれば検索結果にも出ない
6. 作成完了後、**ページのURLからページIDをメモ**(例: `https://www.facebook.com/profile.php?id=1234567890123` の数字部分)

これ以降、Facebookページに対しては **何の操作もしません**。Instagramからの投稿だけが自動で動きます。

### A-3. Instagram と Facebookページ を紐付け

Instagram **アプリ**:

1. プロフィール → **「プロフィールを編集」**
2. **「ページ」** または **「Facebookにリンク」** をタップ
3. 先ほど作ったページを選んで **接続**
4. 紐付け確認: ページ側でもInstagramが表示されていればOK

確認方法:
- Facebook → 自分のページ → 設定 → 「リンク済みのアカウント」 → Instagramが表示されていれば成功

⚠️ **ここが一番ハマるポイント**。「Facebookで意図したページとリンクされている」状態にならないとAPIから見えません。失敗時はFacebookアプリ側からも紐付け操作を試してください。

---

## Phase B: Meta開発者アプリに Instagram プロダクトを追加

ThreadsのSETUP_META.mdで作った **同じアプリ** に追加します。

1. https://developers.facebook.com/apps/ → 既存アプリ(`threads-auto-poster`)を開く
2. ダッシュボード左メニュー → **「製品を追加」** または **「+ Add Product」**
3. **「Instagram Graph API」** カードの **「設定」** をクリック
   - もし「Instagram」が複数表示されていたら **「Instagram Graph API」** を選ぶ(「Instagram Basic Display」ではない)
4. 追加された「Instagram」サブメニューが左に出る

### 権限を有効化

左メニュー **「アプリレビュー」 → 「アクセス許可と機能」** で以下を有効化:

| 権限 | 用途 |
|---|---|
| `instagram_basic` | Instagramアカウント基本情報の取得 |
| `instagram_content_publish` | **投稿の公開(必須)** |
| `pages_show_list` | 紐付くFacebookページの一覧取得 |
| `pages_read_engagement` | ページ情報の読み取り |

開発モード(自分のアカウントだけで使う)なら、**「アプリレビュー」を申請せずとも自分のアカウントでは利用可能** です。アプリ管理者になっていることを確認してください。

---

## Phase C: 長期アクセストークンを取得

### C-1. Graph API Explorer を開く

1. https://developers.facebook.com/tools/explorer/
2. 右上の **「Meta App」** ドロップダウン → 自分のアプリ(`threads-auto-poster`)を選択
3. **「ユーザートークン」** を選択
4. **「権限」** で以下4つにチェック:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
5. **「アクセストークンを生成」** → ログイン承認 → 短期トークン取得(画面上部に表示)

### C-2. アクセストークンを長期化

1. https://developers.facebook.com/tools/debug/accesstoken/ を開く
2. 上のトークンを貼って **「デバッグ」**
3. ページ下部の **「アクセストークンを延長」** ボタン(60日有効化される)
4. 表示された **長期トークン** をコピー → これが `INSTAGRAM_ACCESS_TOKEN`

⚠️ 短期トークンのまま使うと1〜2時間で切れます。必ず延長してください。

---

## Phase D: Instagram Business Account ID を取得

ターミナルで実行:

### D-1. Facebookページ ID を確認

```bash
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_LONG_LIVED_TOKEN"
```

レスポンス例:
```json
{
  "data": [
    {
      "access_token": "EAAxxx...",
      "category": "Architectural Designer",
      "name": "○○建築設計事務所",
      "id": "1234567890123"
    }
  ]
}
```

`id` の値(13桁前後の数字) = **PAGE_ID** をメモ。

### D-2. Instagram Business Account ID を取得

```bash
curl "https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_LONG_LIVED_TOKEN"
```

レスポンス例:
```json
{
  "instagram_business_account": {
    "id": "17841400000000000"
  },
  "id": "1234567890123"
}
```

`instagram_business_account.id` の値(17841で始まる数字) = `INSTAGRAM_USER_ID`

⚠️ もし `instagram_business_account` が返らない場合 → Phase A-3 の紐付けが失敗しています。Instagramアプリで再度連携してください。

---

## Phase E: GitHub Secrets に登録

GitHubリポジトリ → **Settings → Secrets and variables → Actions** で **New repository secret**:

| Name | Value |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | Phase C-2 の長期トークン |
| `INSTAGRAM_USER_ID` | Phase D-2 のID(17841から始まる数字) |

これでInstagram投稿の準備は完了です。

---

## 確認用 curl(動作チェック)

トークンが正しく取得できているか確認:

```bash
# Instagramユーザー情報を取得
curl "https://graph.facebook.com/v21.0/INSTAGRAM_USER_ID?fields=id,username,name,profile_picture_url&access_token=YOUR_TOKEN"
```

これで `username` などが返れば成功。

---

## 投稿の仕組み(参考)

Instagramの投稿は3ステップの非同期処理:

```
1) POST /{ig-user-id}/media
   image_url, caption を渡してメディアコンテナを作成
   → container_id

2) GET /{container_id}?fields=status_code
   "FINISHED" になるまで5秒間隔でpoll(最大60秒)
   "ERROR" の場合は失敗

3) POST /{ig-user-id}/media_publish
   creation_id を渡して公開
   → 投稿ID
```

カルーセル(複数画像スワイプ投稿)の場合:

```
1) 各画像を is_carousel_item=true で個別にcontainer化 → child_id × N
2) media_type=CAROUSEL, children=[child_id...] で親container化
3) 親をpublish
```

---

## トラブルシューティング

### `Invalid OAuth access token` エラー
- 短期トークンを長期化していない可能性 → Phase C-2 をやり直し
- 権限不足 → Phase B の4権限が全て付与されているか確認

### `The user is not an Instagram Business` エラー
- アカウントがプロ(ビジネス/クリエイター)に切り替わっていない → Phase A-1 やり直し

### `Media URL is not accessible` エラー
- 画像URLが公開アクセス可能でない可能性 → GitHub Publicリポジトリを使うか、別CDNを使う
- 画像サイズが大きすぎる(8MB上限) → 圧縮する

### `instagram_business_account` フィールドが空
- Instagram と Facebookページの紐付けが失敗 → Phase A-3 をやり直し
- 別のページに間違えて紐付けている可能性

### 60日経ってトークンが切れた
- Phase C をやり直して新しい長期トークンを生成 → Secretsを更新
- (将来的に自動リフレッシュスクリプトを追加可能)

---

## 1日の投稿上限

Instagram Graph APIは **24時間で25投稿** が上限。1日1〜2投稿なら全く問題ありません。

---

これでセットアップ完了です。次は **README.md の「動作確認」セクション** に従ってDraftを生成し、Issue承認 → 投稿テストを行ってください。
