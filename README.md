# CodeMaster AI

技術面接・コーディング試験の対策に特化した、AIフィードバック付きのコーディング練習アプリです。
自分の就職活動（技術試験対策）のために作り、日常的に使っています。

C++ / Python でアルゴリズム問題を解くと、AIが採点・計算量の評価・面接官目線のコメントを返します。
間違えた問題やトピックは間隔反復で復習に回り、苦手分野に合わせて新しい問題が自動で補充されます。

## 主な機能

| 画面 | 内容 |
| --- | --- |
| ダッシュボード | 学習状況、今日の復習、苦手トピックの推移 |
| カリキュラム | 「定石 → 低レイヤー中級 → 大型テック級」の3段階で並んだ問題集 |
| 問題を解く | コードエディタ（C++ / Python）、段階的ヒント、メンターチャット、提出と採点 |
| AI出題 | トピック・難易度を指定して新しい問題を生成 |
| 模擬面接 | 制限時間つきで面接形式の問題に取り組むモード |
| 知識カード | AWS・ネットワーク（Cisco）・セキュリティ・C++・Python などの穴埋め問題 |
| 復習 | 間違えた問題・カードを間隔反復スケジュールで出し直す |
| 統計 | 日別の提出数・正答率、トピック別の誤答率 |
| アシスタント | 学習履歴を踏まえて次にやることを相談できるチャット |

解いたコードは GitHub Gist に書き出せます（GitHub 連携）。

## 仕組みのポイント

- **AIによる採点**
  提出コードとテストケースをLLMに渡し、`verdict / score / test_results / 計算量 / 指摘 / 解説` を
  JSONスキーマで構造化して受け取ります（`base44/functions/gradeSubmission`）。
  ※ コードを実際に実行して判定しているわけではないため、判定はあくまで目安です。

- **間隔反復（SRS）**
  正解が続くごとに復習間隔を 1 → 3 → 7 → 14 → 30 → 60 日と伸ばし、間違えたら当日に戻します
  （`src/lib/srs.js`）。

- **苦手に合わせたカリキュラム補充**
  未解決の問題が一定数を切ると、誤答した問題と知識カードのトピックを集計して苦手トピックを抽出し、
  今のレベルで無理なく進める難易度だけに絞って新しい問題を生成します
  （`base44/functions/replenishCurriculum`）。基本を2問解くまで中級は出さない、などの段階制御があります。

- **権限設計（Row-Level Security）**
  すべてのデータ（問題・提出・復習スケジュール・知識カード・チャット履歴）は、
  作成したユーザー本人しか読み書きできないように RLS を設定しています（`base44/entities/*.jsonc`）。
  バックエンド関数もログイン中のユーザー権限でデータを扱い、LLM 呼び出しだけをサービス権限で行います。

## 技術構成

- **フロントエンド**: React + Vite、Tailwind CSS、shadcn/ui（Radix UI）、TanStack Query、Recharts
- **バックエンド / BaaS**: [Base44](https://base44.com)（認証、データベース、サーバーレス関数、LLM 連携）
- **サーバーレス関数**（TypeScript, `base44/functions/`）
  - `gradeSubmission` 採点 / `generateProblem` 問題生成 / `generateHint` ヒント
  - `mentorChat` 問題ごとの相談 / `assistantChat` 学習全体の相談
  - `adviseCurriculum`・`replenishCurriculum` カリキュラムの助言と補充
  - `exportGist` GitHub Gist への書き出し

```
src/
  pages/        各画面
  components/   UI コンポーネント（dashboard / workspace / knowledge / curriculum ...）
  lib/          SRS、集計、言語設定などのロジック
base44/
  entities/     データモデル定義（RLS を含む）
  functions/    サーバーレス関数
```

## 開発について

AIアプリビルダーの Base44 と Claude を使って開発しました。
何を作るか（機能要件・カリキュラムの段階設計・復習の仕組みなど）を決めて AI に実装させ、
生成されたコードをレビューして、権限設計の追加などの修正を行っています。

## ローカルで動かす

[Base44 CLI](https://docs.base44.com/developers/references/cli/get-started/overview) と
[Deno](https://docs.deno.com/runtime/getting_started/installation/) が必要です。

```bash
npm install
npm install -g base44@latest
base44 login   # 初回のみ
base44 link    # クローンごとに1回（自分の Base44 アプリに紐づける）
base44 dev     # ローカルのバックエンドとフロントエンドを同時に起動
```

`npm run dev` 単体ではバックエンドが動かないので、`base44 dev` を使ってください。
詳しくは [ローカル開発のドキュメント](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview) を参照。
