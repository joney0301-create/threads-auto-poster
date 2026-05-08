# Threads + Instagram 自動投稿 — colohu.com 連携版

> 📌 **はじめての方は [START_HERE.md](START_HERE.md) を先に開いてください。** 専門用語をゼロから説明する完全ガイドがあります。READMEは概要と参照用です。

[colohu.com](https://colohu.com) に掲載されている作品の **画像URLと設計概要** を [sources.json](sources.json) に登録 → Claude APIが投稿用の文章を生成 → スマホで承認 → Threads / Instagram に自動投稿する仕組みです。

GitHub Actionsで動くので **PCを開かなくても運用** できます。完全無料(Claude APIだけ月100〜300円)。

## 全体像

```
┌─────────────────────────────────────────────────────────┐
│ 事前準備 (1回だけ): sources.json に作品情報を登録          │
│   ・HPの作品ページから画像URLをコピー                    │
│   ・HPの説明文を3〜4行コピー                              │
│   ・1作品あたり3分                                        │
│                                                           │
│ ① 朝7時(JST) — Draft Workflow が自動起動                 │
│   ・sources.jsonから1作品を選択(直近未使用優先)         │
│   ・Claudeで Threads用本文(500字以内)を生成             │
│   ・Claudeで Instagram用キャプション(2200字以内)を生成  │
│    ↓                                                      │
│   GitHub Issue として「投稿予定」を起票                  │
│   (HP掲載画像のプレビュー + 両SNSの本文)                │
│                                                           │
│ ② スマホのGitHubアプリに通知                             │
│    ↓                                                      │
│   ・Threadsだけ      → ラベル `approved-threads`         │
│   ・Instagramだけ    → ラベル `approved-instagram`       │
│   ・両方             → ラベル `approved-both`            │
│   ・修正してから     → 本文編集してからラベル付与       │
│   ・却下             → ラベル `rejected`                 │
│                                                           │
│ ③ ラベル付与 → Publish Workflow が自動起動 → 各SNSへ投稿│
└─────────────────────────────────────────────────────────┘
```

## ファイル構成

```
threads-auto-poster/
├── .github/workflows/
│   ├── draft.yml                  # 朝7時に下書き生成 → Issue起票
│   └── publish.yml                # ラベル付与で該当SNSへ投稿
├── sources.json                   # ★HPから持ってきた作品情報のリスト
├── post.js                        # draft / publish 両モード, 両SNS対応
├── config.json                    # ペルソナ・トピック・各SNSのスタイルルール
├── posts.log                      # 投稿履歴 (自動更新)
├── .env.example                   # ローカル動作確認用
├── SETUP_META.md                  # ★ STEP 1a: Threads APIトークン取得手順
├── SETUP_INSTAGRAM.md             # ★ STEP 1b: Instagram APIトークン取得手順
└── README.md                      # このファイル
```

---

## セットアップ全体の流れ

```
[STEP 1a] Threads APIトークン取得 (45-90分)    → SETUP_META.md
[STEP 1b] Instagram APIトークン取得 (60-90分)  → SETUP_INSTAGRAM.md
            ↓ (両方やってもいいし、最初はThreadsだけでもOK)
[STEP 2]  Anthropic APIキー取得 (10-15分)
[STEP 3]  sources.json に作品情報を登録 (作品×3分)
[STEP 4]  GitHubに上げてSecrets登録 (20-40分)
[STEP 5]  動作確認 → 運用開始 (30-60分)
```

合計 **約3〜6時間**。

---

## STEP 1a: Threads APIトークンを取得

→ **[SETUP_META.md](SETUP_META.md)**

完了時点で手元にあるべきもの: `THREADS_ACCESS_TOKEN`, `THREADS_USER_ID`

## STEP 1b: Instagram APIトークンを取得

→ **[SETUP_INSTAGRAM.md](SETUP_INSTAGRAM.md)** (Facebookページはダミーで作るだけでOK)

完了時点で手元にあるべきもの: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`

## STEP 2: Anthropic APIキー取得

1. https://console.anthropic.com/ でアカウント作成
2. **「API Keys」** → **「Create Key」**
3. `sk-ant-...` をコピー → これが `ANTHROPIC_API_KEY`
4. クレジット最低 $5 チャージ

---

## STEP 3: sources.json に作品情報を登録 ★最重要★

[sources.json](sources.json) はこの仕組みの **データソース** です。各作品ごとに以下を1セット登録します。

### 登録するフィールド

| フィールド | 必須 | 内容 |
|---|---|---|
| `id` | ✅ | 作品の識別子(英数+ハイフン推奨。例: `house-tokyo-2024`) |
| `title` | ✅ | 作品名 |
| `location` | 任意 | 場所・竣工年(例: `東京都 / 2024年`) |
| `image_url` | ✅ | **HPに掲載されている画像の絶対URL**(後述の取り方参照) |
| `source_url` | 任意 | HP上の作品ページURL(参照リンクとしてIssueに表示) |
| `description` | ✅ | **設計の概要**(3〜4文がベスト。長すぎず短すぎず) |
| `topic_hint` | 任意 | 投稿時のテーマ([config.json](config.json)の`topics`から選ぶ。空ならランダム) |

### HPから画像URLを取る手順 (Mac/Chrome の場合)

colohu.com を例に説明:

1. https://colohu.com/ をChromeで開く
2. 作品一覧から1つ選んで作品ページへ
3. 使いたい **画像を右クリック** → **「画像のアドレスをコピー」**(Safariなら「画像のURLをコピー」)
4. 取得したURLを `image_url` に貼る
   - 例: `https://colohu.com/_app/immutable/assets/works-12345.abc.jpg`

⚠️ `https://` から始まる **絶対URL** であること(`./xxx.jpg` のような相対パスはNG)。
⚠️ ブラウザでそのURLを直接開いて画像が表示されることを確認してください(これは Instagram API がアクセスできるか確認に等しい)。

### 説明文の取り方

HPの作品ページにある **設計コンセプトの文章を3〜4文だけ** 抜粋して貼り付け。

例:
```
南面に大開口を取り、内外を緩やかにつなぐ縁側のある住宅。
素材は杉と漆喰、構造は在来工法。
施主の『四季を感じる暮らし』という要望に応えて設計した。
```

短すぎる(20文字以下)とClaudeが文章を膨らませにくく、長すぎる(500文字以上)とノイズが増えます。**100〜300文字** がスイートスポット。

### sources.json への追記例

```json
[
  {
    "id": "house-tokyo-2024",
    "title": "○○邸",
    "location": "東京都 / 2024年竣工",
    "image_url": "https://colohu.com/path/to/works-image-001.jpg",
    "source_url": "https://colohu.com/works/example",
    "description": "南面に大開口を取り、内外を緩やかにつなぐ縁側のある住宅。素材は杉と漆喰、構造は在来工法。",
    "topic_hint": "光と影の設計について"
  },
  {
    "id": "cafe-yokohama-2023",
    "title": "△△カフェ",
    "location": "神奈川県 / 2023年竣工",
    "image_url": "https://colohu.com/path/to/cafe-image-001.jpg",
    "source_url": "https://colohu.com/works/cafe",
    "description": "築60年の木造倉庫をリノベーション。既存の梁を見せながら、新しい家具で素材の対比を作った。",
    "topic_hint": "リノベーションで残すもの・変えるもの"
  }
]
```

最低でも **5〜10作品分** 登録しておくと、しばらくネタが尽きず運用できます。

---

## STEP 4: GitHubに上げてSecrets登録

### 4-1. リポジトリ作成 + プッシュ

```bash
cd "/Users/osakimasaki/Documents/cloude/名称未設定フォルダ/threads-auto-poster"
git init
git add .
git commit -m "initial setup"
git branch -M main
gh repo create threads-auto-poster --public --source=. --push
# (gh CLIが無い場合は github.com で先にリポジトリ作成 → git remote add origin ... → git push -u origin main)
```

### 4-2. Secrets を登録

GitHubのリポジトリページ **Settings → Secrets and variables → Actions → New repository secret**:

| Name | 必須? | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | STEP 2 のキー |
| `THREADS_ACCESS_TOKEN` | Threads使うなら | STEP 1a のトークン |
| `THREADS_USER_ID` | Threads使うなら | STEP 1a のID |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram使うなら | STEP 1b のトークン |
| `INSTAGRAM_USER_ID` | Instagram使うなら | STEP 1b のID |

⚠️ 画像はHP(colohu.com)から直接配信されるため、`IMAGE_BASE_URL` は **不要** です(以前の設計と異なります)。

---

## STEP 5: 動作確認 → 運用開始

### 5-1. 手動で初回ドラフト生成

GitHubの **Actions** タブ → **Draft (生成 → Issue起票)** → **Run workflow**

数分後、**Issues** タブに「[投稿予定] ...」というIssueが立ち、HP画像 + Threads本文 + Instagramキャプションが表示される。

### 5-2. 中身を確認・調整

- 文章のトーンが気に入らない → [config.json](config.json) の `persona` `threads_style_rules` `instagram_style_rules` を編集してプッシュ → もう一度 Run workflow
- 微調整したい → Issue本文の各 START/END マーカー間を直接編集

### 5-3. 承認 → 投稿テスト

Issue右側 **Labels** から目的のラベルを選択:
- `approved-threads` だけ → Threadsだけ投稿
- `approved-instagram` だけ → Instagramだけ投稿
- `approved-both` → 両方投稿

数十秒〜1分後、各SNSアプリで投稿確認。Issueに「✅ 投稿しました」コメントが付き自動close。

### 5-4. 自動運用開始

[draft.yml](.github/workflows/draft.yml) のcronで **毎日 JST 7:00 に下書きIssueが立つ** ようになります。

頻度を変えたい場合は `cron` を編集(UTC基準なのでJST -9時間):

| 投稿頻度 | cron |
|---|---|
| 毎朝7時 (デフォルト) | `0 22 * * *` |
| 平日のみ朝7時 | `0 22 * * 0-4` |
| 週1回 (日曜の朝) | `0 22 * * 6` |
| 1日2回 (朝7時/夜18時) | `0 22 * * *` と `0 9 * * *` |

---

## スマホからの日常運用

GitHub公式アプリ(iOS/Android)で:

1. アプリの Settings → Notifications で対象リポジトリ通知ON
2. 朝7時頃 → Issue起票通知
3. 通知タップ → HP画像プレビュー + Threads/Instagramそれぞれの本文を確認
4. 右の **Labels** タップ → 投稿先のラベルを選択
5. 数十秒後 → 「投稿しました」コメントで完了確認

新作がHPに上がったとき: **sources.json に1エントリ追加してプッシュ** するだけ。

---

## ローカルで動作確認

```bash
cd "/Users/osakimasaki/Documents/cloude/名称未設定フォルダ/threads-auto-poster"
cp .env.example .env
# .env を編集
npm install
set -a && source .env && set +a

# 下書き(Threads + Instagram両方)を生成
node post.js draft

# Threads投稿(画像なしならDRAFT_IN_IMAGE_URL省略)
DRAFT_IN_THREADS_TEXT="投稿したい文章" \
  DRAFT_IN_IMAGE_URL="https://colohu.com/path/to/image.jpg" \
  TARGET=threads \
  node post.js publish

# Instagram投稿(必ず画像URLが必要)
DRAFT_IN_INSTAGRAM_CAPTION="投稿したいキャプション #建築設計" \
  DRAFT_IN_IMAGE_URL="https://colohu.com/path/to/image.jpg" \
  TARGET=instagram \
  node post.js publish
```

---

## 注意事項

- **長期トークンは60日で切れる** → 期限前に各 SETUP_*.md の手順をやり直してSecretsを更新
- **Threads: 1日250投稿 / Instagram: 1日25投稿まで**
- **HPの画像URLが変わるとリンク切れ** → HPリニューアル時は sources.json も更新
- **画像は8MB以下、5KB以上、JPG推奨**(Instagram要件)
- **承認しなければ投稿されません**。気が向いた日だけ投稿、もOK
- **作品の追加は sources.json に追記してpush するだけ**(ワークフロー側の編集は不要)
