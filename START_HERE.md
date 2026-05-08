# はじめての人向け・完全ガイド

このページから読み始めてください。**プログラミング未経験を前提に、画面の操作レベルで** ぜんぶ書いてあります。専門用語が出てきたら、その都度説明します。

> **大前提**: 一気に全部やる必要はありません。**30分〜1時間の隙間時間を6回くらい** に分けてやれば終わります。途中で詰まったら、その時点でClaudeに「ここで止まった」と聞いてください。

---

## 全体マップ

```
┌──────────────────────────────────────────────────────┐
│  Phase 0: 必要なものを揃える              5分        │
│  Phase 1: アカウントを作る(3つ)         30分      │
│  Phase 2: スレッズ用のカギを取る           60〜90分  │
│  Phase 3: インスタ用のカギを取る           60〜90分  │
│  Phase 4: 作品データを登録                30〜60分   │
│  Phase 5: GitHubに上げる                  30分       │
│  Phase 6: 初投稿テスト → 運用スタート     30分       │
└──────────────────────────────────────────────────────┘
合計: 約4〜6時間 (1日でやる必要なし)
```

---

## Phase 0: 必要なものを揃える(5分)

手元に以下があるか確認:

- [ ] **Mac**(このパソコン)
- [ ] **スマホ**(iPhone or Android)
- [ ] **メールアドレス**(GmailなどでOK)
- [ ] **Facebookアカウント**(なければ後で作る、数分)
- [ ] **Instagramアカウント**(普段使っているもの)
- [ ] **クレジットカード**(Anthropicのチャージ用。最初は **$5 = 約750円** だけ)

これだけ。プログラミング知識は不要です。

---

## Phase 1: アカウントを3つ作る(30分)

サービスを使うために最初にアカウントを作っておくと、あとがスムーズです。

### 1-1. GitHubアカウントを作る (10分)

**「GitHub」とは**: プログラムのコードを保管・実行する場所。今回は「自動投稿の仕組みを動かしてくれるロボット」みたいなものとして使います。

**手順**:
1. ブラウザで https://github.com/signup を開く
2. **メールアドレス** を入力 → 「Continue」
3. **パスワード** を決めて入力 → 「Continue」
4. **ユーザー名** を決める(英数字、例: `colohu-archi`)→ 「Continue」
5. メールに届く認証コードを入力
6. 「How many team members will be working with you?」→ **「Just me」** を選ぶ
7. 「What is your team primarily interested in?」→ どれでもOK、適当に
8. プランは **「Free」** を選択
9. 完了!

✅ 終わったら、 https://github.com/ にログインできる状態になります。

### 1-2. Anthropicアカウントを作る (10分)

**「Anthropic」とは**: Claudeを作っている会社。今回はClaude(AI)に投稿文を書いてもらうために使います。

**手順**:
1. ブラウザで https://console.anthropic.com/ を開く
2. **「Sign up with Google」** をクリック(普段のGoogleアカウントを使うのが楽)
3. 国は「Japan」、組織名は適当に「colohu」など
4. ダッシュボード(管理画面)が開いたら成功

**クレジットチャージ(あとでもOK)**:
1. 左メニューの **「Plans & Billing」** をクリック
2. **「Add credits」** で **$5** をチャージ(クレカ登録)
3. これで月100〜300円ペースで2〜6ヶ月もちます

### 1-3. Meta開発者アカウントを作る (10分)

**「Meta」とは**: Facebook・Instagram・Threadsの親会社。これらに投稿するためには、Metaの開発者アカウントが必要です。

**前提**: Facebookアカウントが必要。なければ https://www.facebook.com/ で先に作る(5分)。

**手順**:
1. ブラウザで https://developers.facebook.com/ を開く
2. 右上 **「ログイン」** → 普段のFacebookアカウントでログイン
3. 初回は「開発者として登録しますか?」みたいな画面が出る → **「次へ」「同意する」**
4. 電話番号認証 → SMSで届くコードを入力
5. 「あなたの役割」→ **「開発者」**
6. 「主な用途」→ **「自分用 / その他」**
7. 完了

✅ これで開発者ダッシュボードが使えるようになります。

---

> 📌 **ここまで終わったら、いったん休憩して大丈夫です。** Phase 2から先は集中力が要るので、まとまった時間を取れる日にやってください。

---

## Phase 2: スレッズ用のカギを取る(60〜90分)

「カギ」というのは、**APIトークン** という長い文字列のことです。これが「スレッズに投稿していいよ」という許可証になります。

### このPhaseでやること
- スレッズ用のアプリを「Meta開発者ダッシュボード」に登録する
- カギ(トークン)を発行する
- 自分のスレッズIDを取得する

### 詳細手順
詳しいクリック単位の手順は **[SETUP_META.md](SETUP_META.md)** に書いてあります。それを開いて上から順にやってください。

### 詰まりやすいポイント

| 状況 | 対処 |
|---|---|
| 「Threadsプロダクト」が選択肢に出ない | アプリタイプを「ビジネス」にする |
| トークンが「Invalid」と言われる | 短期トークンを **長期化** していない可能性。SETUP_META.md のSTEP 7〜8をやり直す |
| `client_secret` を忘れた | Metaの「アプリの設定」→「ベーシック」で再表示できる |

### このPhaseが終わったときに手元にあるべきもの

メモ帳に貼り付けて保管:
- `THREADS_ACCESS_TOKEN`: `THAA0xxxxxxxxxx...`(60日有効)
- `THREADS_USER_ID`: `1234567890123456`(数字)

これが取れたらPhase 2完了です 🎉

---

## Phase 3: インスタ用のカギを取る(60〜90分)

Phase 2と同じ要領でインスタ用のカギも取ります。

### 事前準備(これがちょっと面倒)

インスタの自動投稿には、Metaの仕様で **「Facebookページ」** が必要です。**ただしダミーで作るだけでOK** です(運用しなくていい)。

具体的には:
1. インスタの**設定でプロアカウントに切り替える**(クリエイター or ビジネス)
2. **ダミーのFacebookページを作る**(投稿しなくていい、誰にも見せなくていい)
3. **インスタとFacebookページを紐付ける**

これが一番ハマるところ。詳しくは **[SETUP_INSTAGRAM.md](SETUP_INSTAGRAM.md)** の **Phase A** に書いてあります。

### このあとは Phase 2 と同じ

- 同じMeta開発者アプリに「Instagram Graph API」を追加
- 権限を有効化
- アクセストークンを発行
- Instagramの自分のIDをcurlコマンドで取得

詳しくは **[SETUP_INSTAGRAM.md](SETUP_INSTAGRAM.md)** の Phase B以降。

### 「curlコマンドって何?」

curlとは「ターミナルからURLにアクセスする道具」です。

**Macでターミナルを開く方法**:
1. **Command + スペース** で Spotlight を開く
2. **「ターミナル」** と入力 → Enter
3. 黒い画面が開く → コマンドを貼り付けて Enter

ターミナルに貼り付けるコマンドは SETUP_INSTAGRAM.md にそのまま書いてあるので、コピペするだけでOKです。

### このPhaseが終わったときに手元にあるべきもの

- `INSTAGRAM_ACCESS_TOKEN`: `EAAxxxxxxxxx...`
- `INSTAGRAM_USER_ID`: `17841400000000000`(17841で始まる)

---

> 📌 **Phase 2 と Phase 3 が終われば、難所はほぼ越えました。** あとはずっと優しいです。

---

## Phase 4: 作品データを登録する(30〜60分)

ここからが「あなたの作品をシステムに教える」作業。**プログラミングはありません、コピペ作業です。**

### 4-1. ターミナルで作業フォルダを開く

Macの **Finder** で以下のフォルダを開きます:

```
書類 → cloude → 名称未設定フォルダ → threads-auto-poster
```

中にある **`sources.json`** というファイルを **メモアプリ**(または **VS Code** など)で開いてください。

### 4-2. sources.jsonの中身を確認

最初は以下のようなサンプルが入っています:

```json
[
  {
    "id": "sample-house-01",
    "title": "○○邸",
    "location": "東京都 / 2024年竣工",
    "image_url": "https://colohu.com/path/to/work-image.jpg",
    "source_url": "https://colohu.com/works/example",
    "description": "南面に大開口を取り...",
    "topic_hint": "光と影の設計について"
  },
  ...
]
```

これは「サンプル」なので、**全部消して、自分の作品に書き換えます**。

### 4-3. 1つ目の作品を登録(3〜5分)

ブラウザで https://colohu.com/ を開いて、登録したい作品ページを開きます。

#### ① 画像URLを取る

1. 投稿に使いたい **画像を右クリック**
2. **「画像のアドレスをコピー」**(Safariなら「画像のURLをコピー」)
3. これをメモ帳に一旦貼って、形を確認:
   - OKな例: `https://colohu.com/_app/.../image.jpg`
   - NG例: `./image.jpg` (← これは相対パス、使えない)

**確認のため、コピーしたURLをブラウザのアドレスバーに貼って Enter** → 画像が単独で表示されればOK。表示されないと投稿失敗します。

#### ② 説明文を取る

HPの作品ページにある **設計コンセプトの文章** から、3〜4文だけコピーします。

**良い例**(100〜300文字):
```
南面に大開口を取り、内外を緩やかにつなぐ縁側のある住宅。
素材は杉と漆喰、構造は在来工法で構成した。
施主の「四季を感じる暮らし」という要望に応えて、
庭との一体感を大切にした設計とした。
```

短すぎ・長すぎはClaudeが書きにくくなります。

#### ③ sources.json に書き込む

`sources.json` を以下のように書き換えます:

```json
[
  {
    "id": "house-tokyo-2024",
    "title": "○○邸",
    "location": "東京都 / 2024年竣工",
    "image_url": "https://colohu.com/_app/.../image.jpg",
    "source_url": "https://colohu.com/works/example",
    "description": "南面に大開口を取り、内外を緩やかにつなぐ縁側のある住宅。素材は杉と漆喰、構造は在来工法で構成した。施主の「四季を感じる暮らし」という要望に応えて、庭との一体感を大切にした設計とした。",
    "topic_hint": "光と影の設計について"
  }
]
```

書くときの注意:
- `"` (ダブルクォート)で囲む
- 各行の終わりに `,`(カンマ)が必要(ただし最後の行はカンマ不要)
- `id` は英数字+ハイフンで自由に決めてOK(例: `house-tokyo-2024`)
- `topic_hint` は [config.json](config.json) の `topics` の中から1つ選ぶ(任意)

### 4-4. 2つ目以降の作品を追加

同じ要領で追加します。複数の作品はこう書きます:

```json
[
  {
    "id": "house-tokyo-2024",
    "title": "...",
    ...
  },
  {
    "id": "cafe-yokohama-2023",
    "title": "...",
    ...
  },
  {
    "id": "store-osaka-2022",
    "title": "...",
    ...
  }
]
```

⚠️ **`}` のあとに `,` を忘れずに**(最後の作品だけはカンマ無し)。

### 4-5. 最低5〜10作品を登録

ローテーションで投稿するので、5作品以上あるとしばらくネタ切れしません。

### 困ったとき

JSONの書式がわからなくなったら、Claudeに「sources.jsonにこの作品を追加したい、画像URLは○○、説明文は○○、書いて」と聞けば書き出してくれます。

---

## Phase 5: GitHubに上げる(30分)

書いたコードを「GitHubのロボット」に渡して、毎日自動で動くようにする工程です。

### 5-1. ターミナルを開いて作業フォルダに移動

ターミナルを開いて、以下を **コピペして Enter**:

```bash
cd "/Users/osakimasaki/Documents/cloude/名称未設定フォルダ/threads-auto-poster"
```

### 5-2. Gitの初期化

以下を順にコピペして Enter(各行ごとに実行):

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "initial setup"
```

```bash
git branch -M main
```

最後の3つのコマンドのうち1つ目を打ったとき、もし「Please tell me who you are」みたいなエラーが出たら、以下を実行してから `git commit` をやり直し:

```bash
git config --global user.email "あなたのメールアドレス"
git config --global user.name "あなたの名前"
```

### 5-3. GitHubにリポジトリを作成

ブラウザで https://github.com/new を開く:

1. **Repository name**: `threads-auto-poster`(任意)
2. **Public** を選択(画像URLが外から見える必要があるため)
3. **「Create repository」** クリック

開いた次の画面で、以下のような **長いコマンド** が表示されます。例:

```bash
git remote add origin https://github.com/colohu-archi/threads-auto-poster.git
git push -u origin main
```

これを **そのままコピペしてターミナルで実行**。

途中で「Username」「Password」を聞かれたら:
- Username = GitHubのユーザー名
- Password = **GitHubのパスワードではなく、Personal Access Token**(後述)

#### Personal Access Tokenの作り方(初回のみ)

1. https://github.com/settings/tokens を開く
2. **「Generate new token」 → 「Generate new token (classic)」**
3. **Note**: `threads-poster` (任意の名前)
4. **Expiration**: `No expiration` か `90 days` など
5. **Select scopes**: `repo` だけチェック
6. **Generate token** → 表示された `ghp_xxxxx...` を **必ずコピー**(二度と表示されない)
7. これを `git push` のときの「Password」として使う

### 5-4. Secrets(秘密情報)を登録

GitHubのリポジトリページで、上部メニューの **「Settings」** をクリック → 左メニュー **「Secrets and variables」 → 「Actions」**:

**「New repository secret」** を押して、以下を1つずつ登録:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Phase 1-2 で取った `sk-ant-...` |
| `THREADS_ACCESS_TOKEN` | Phase 2 で取ったトークン |
| `THREADS_USER_ID` | Phase 2 で取ったID |
| `INSTAGRAM_ACCESS_TOKEN` | Phase 3 で取ったトークン |
| `INSTAGRAM_USER_ID` | Phase 3 で取ったID |

入力したら **「Add secret」**。5回繰り返します。

⚠️ Secretsに入れた値は **二度と表示されません**(セキュリティのため)。Anthropicキーやトークンは別途メモ帳にも保管しておくと安心。

---

## Phase 6: 初投稿テスト → 運用スタート(30分)

### 6-1. 手動でドラフト生成

GitHubのリポジトリページで:
1. 上部メニュー **「Actions」** をクリック
2. 左メニュー **「Draft (生成 → Issue起票)」** をクリック
3. 右の **「Run workflow」** ボタン → 緑の **「Run workflow」** をクリック
4. 30秒〜2分待つ → 緑のチェックマークが付けば成功

失敗(赤い×)した場合は、そのワークフロー名をクリック → ログを見るとエラーがわかる。エラーメッセージをClaudeに貼って聞けば対処方法が分かります。

### 6-2. 生成されたIssueを確認

リポジトリページの上部 **「Issues」** タブをクリック → **「[投稿予定] ...」** という新しいIssueが立っているはず。

開いてみると、以下が表示されます:
- 使用予定の画像プレビュー
- Threads用本文(500字以内)
- Instagram用キャプション(2200字以内、ハッシュタグ多め)

### 6-3. スマホで確認できるようにする

App Storeで **「GitHub」** アプリをインストール → ログイン → 通知をON。

これで、毎朝7時にIssueが立つと **スマホに通知** が来ます。タップすればその場で本文と画像を確認できます。

### 6-4. 承認して投稿

Issue画面の右側 **「Labels」** をタップ:
- 🧵 Threadsだけ → `approved-threads`
- 📷 Instagramだけ → `approved-instagram`
- 🚀 両方 → `approved-both`
- ❌ やめる → `rejected`

ラベルを付けてから **30秒〜1分** で各SNSに投稿されます。Issueに「✅ 投稿しました」とコメントが付いて自動でクローズします。

各SNSアプリ(スマホ)で投稿が反映されているか確認しましょう。

### 6-5. 自動運用スタート

ここまで成功したら、以後は何もしなくても **毎朝JST 7:00 にドラフトIssueが立つ** ようになります。

頻度を変えたい場合は [.github/workflows/draft.yml](.github/workflows/draft.yml) の `cron` の行を編集すればOK(詳しくはREADME.md参照)。

---

## 困ったときに

各Phase別に、よくある詰まり方と対処を書いておきます。

### 「とにかくよく分からない」
→ 詰まったStepの **画面のスクショ** を撮って、私(Claude)に見せてください。状況に合わせて対処方法を答えます。

### 「コマンドを打つのが怖い」
→ ターミナルのコマンドは、**間違えても基本的に壊れません**。エラーメッセージが出るだけ。エラー文をそのままClaudeに貼って「これどうしたらいい?」と聞けばOK。

### 「Phase 2 / 3 のMeta画面でどこを押すか分からない」
→ Metaの画面はちょこちょこ変わるので、**スクショを撮って送ってください**。最新の画面に合わせて指示します。

### 「文章のトーンが気に入らない」
→ [config.json](config.json) を編集すると変えられます。これも具体的に「もっと砕けた感じに」みたいに言ってもらえれば、私が編集します。

### 「もう諦めたい...」
→ 大丈夫です。**Phase 2(スレッズ)だけ完了させて、Threadsだけで運用** することもできます。インスタは後回しでOK。

---

## 進捗チェックリスト

スマホでこのページを開いて、終わったらチェック:

- [ ] Phase 0: 必要なものを揃えた
- [ ] Phase 1-1: GitHubアカウント作成
- [ ] Phase 1-2: Anthropicアカウント作成 + クレジット$5チャージ
- [ ] Phase 1-3: Meta開発者アカウント作成
- [ ] Phase 2: ThreadsトークンとユーザーIDを取得
- [ ] Phase 3: Instagramトークンとユーザー ID を取得
- [ ] Phase 4: sources.jsonに作品5〜10件登録
- [ ] Phase 5-1〜2: ローカルでgit init / commit
- [ ] Phase 5-3: GitHubにリポジトリ作成 + push
- [ ] Phase 5-4: Secretsを5つ登録
- [ ] Phase 6-1: 手動でDraft Workflow実行成功
- [ ] Phase 6-2: Issue確認
- [ ] Phase 6-3: スマホGitHubアプリ通知設定
- [ ] Phase 6-4: ラベル付与で初投稿成功
- [ ] Phase 6-5: 翌朝7時に自動でIssueが立つことを確認

ここまで来たら **完成** 🎉。あとは作品が増えるたびに sources.json に追記するだけ、何年でも回り続けます。
