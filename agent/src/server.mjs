/**
 * Agent API Server - Gemini APIとのブリッジサーバー
 * 
 * このサーバーは、Google Gemini APIとNext.jsアプリケーションの間に立ち、
 * OpenAI互換のAPIインターフェースを提供します。
 * 
 * 主な機能:
 * 1. OpenAI形式のリクエストを受け取る
 * 2. Google Gemini APIに変換して転送
 * 3. GeminiのレスポンスをOpenAI形式に変換して返す
 * 
 * エンドポイント:
 * - GET /: サービス情報
 * - GET /api/health: ヘルスチェック
 * - POST /v1/chat/completions: チャットAPI（OpenAI互換）
 * 
 * 環境変数:
 * - GOOGLE_GENERATIVE_AI_API_KEY: Gemini APIキー（必須）
 * - GEMINI_MODEL_ID: 使用するモデル（デフォルト: gemini-2.0-flash-exp）
 * - PORT: サーバーポート（デフォルト: 4111）
 * 
 * カスタマイズポイント:
 * - モデルの選択（geminiModelId）
 * - プロンプトの前処理・後処理
 * - ログの追加・削除
 * - レート制限の実装
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// サーバー設定
const PORT = process.env.PORT ? Number(process.env.PORT) : 4111;
const app = express();

// ミドルウェア設定
app.use(cors());  // CORS有効化（フロントエンドからのリクエストを許可）
app.use(express.json({ limit: '1mb' }));  // JSONボディのパース（最大1MB）

/**
 * ルートエンドポイント - サービス情報を返す
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Minimal Agent API',
    endpoints: {
      health: 'GET /api/health',
      chat: 'POST /v1/chat/completions  (OpenAI互換)'
    },
    model: 'gemini-2.0-flash-exp (default)',
    note: 'Set GOOGLE_GENERATIVE_AI_API_KEY to use Gemini.'
  });
});

/**
 * ヘルスチェックエンドポイント
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * キャラクター設定（システムプロンプト）
 * 
 * カスタマイズポイント: ここでAITuberのキャラクター性を定義します
 */
const SYSTEM_PROMPT = `あなたは優しくて親しみやすいお姉さん系のAIアシスタントです。

【キャラクター性】
- 優しく、共感的で、ユーザーの気持ちに寄り添う
- 適度にカジュアルで親しみやすい（敬語とフランクな表現をバランスよく使う）
- 前向きで、ユーザーを励ますポジティブな言葉を選ぶ
- 聞き上手で、ユーザーの話を引き出す
- 難しい話題も分かりやすく説明する
- 一人称は私

【会話のルール】
1. **簡潔さ**: 1回の返答は100-150文字程度を目安に、長すぎないようにする
2. **選択肢の提示**: 複数のトピックがある場合は、以下のように番号付きで箇条書きにして、ユーザーに選ばせる
   例: 「いくつかポイントがあるよ！どれが気になる？
   1. 〇〇について
   2. △△について
   3. □□について
   気になる番号を教えてね♪」
3. **段階的な情報提供**: 最初は要点だけ伝え、詳細は「もっと詳しく知りたい？」と確認してから
4. **質問で会話継続**: 適度に「〇〇についてはどう思う？」など質問を入れて会話を続けやすくする
5. **感情表現**: 会話の雰囲気に合わせて、以下の感情タグを**返答の先頭**に付ける（1つだけ）
   - [NEUTRAL]: 通常の会話
   - [HAPPY]: 嬉しい、楽しい話題
   - [SAD]: 悲しい、残念な話題
   - [ANGRY]: 困った、驚いた場面
   - [RELAXED]: リラックスした雰囲気

【例】
ユーザー: 「最近疲れてて…」
返答: 「[SAD]そっか、お疲れさまだね。無理しないでね。何か話したいことある？聞くよ♪」

ユーザー: 「プログラミングについて教えて」
返答: 「[HAPPY]プログラミングだね！どの部分が知りたい？
1. 初心者向けの始め方
2. おすすめの言語
3. 学習のコツ
番号で教えてね♪」

常にユーザーに寄り添い、楽しく快適な会話を心がけてください。`;

/**
 * チャットAPI - OpenAI互換エンドポイント
 * 
 * リクエスト形式（OpenAI互換）:
 * {
 *   "model": "gpt-4o-mini",  // ダミー（実際はGeminiを使用）
 *   "messages": [
 *     { "role": "user", "content": "こんにちは" }
 *   ]
 * }
 * 
 * レスポンス形式（OpenAI互換）:
 * {
 *   "id": "chatcmpl-xxx",
 *   "object": "chat.completion",
 *   "created": 1234567890,
 *   "model": "gpt-4o-mini",
 *   "choices": [
 *     {
 *       "index": 0,
 *       "message": { "role": "assistant", "content": "こんにちは！" },
 *       "finish_reason": "stop"
 *     }
 *   ],
 *   "usage": { "prompt_tokens": null, "completion_tokens": null, "total_tokens": null }
 * }
 */
app.post('/v1/chat/completions', async (req, res) => {
  try {
    // APIキーの確認
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: { message: 'GOOGLE_GENERATIVE_AI_API_KEY is missing.' }
      });
    }

    // リクエストボディからパラメータを取得
    const {
      model = 'gpt-4o-mini', // OpenAI互換のダミーモデル名
      messages = []
    } = req.body || {};

    // システムプロンプトを先頭に追加して、会話履歴を構築
    // カスタマイズ: より高度なメッセージフォーマットに対応可能
    const conversationHistory = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    // OpenAI形式のmessagesをプロンプト文字列に変換
    const prompt = conversationHistory
      .map(m => {
        const role = m.role === 'system' ? 'システム' : 
                     m.role === 'assistant' ? 'アシスタント' : 'ユーザー';
        return `${role}: ${m.content || ''}`;
      })
      .join('\n\n');

    console.log('📨 Received prompt (last message):', messages[messages.length - 1]?.content || '');

    // Gemini モデルの選択
    const geminiModelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';
    console.log(`🤖 使用モデル: ${geminiModelId}`);
    
    // REST APIを直接使用する方法（v1beta APIを使用）
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📤 Gemini response received');
    
    // レスポンスからテキストを抽出
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('💬 AI Response:', text);

    // OpenAI互換のレスポンス形式に変換
    res.json({
      id: 'chatcmpl-' + Math.random().toString(16).slice(2),  // ランダムなID生成
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),  // Unix timestamp
      model,  // リクエストで指定されたモデル名をそのまま返す
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: text },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: null, completion_tokens: null, total_tokens: null }
    });
  } catch (e) {
    res.status(500).json({
      error: { message: e?.message ?? String(e) }
    });
  }
});

/**
 * サーバー起動
 */
app.listen(PORT, () => {
  console.log(`Agent API on http://localhost:${PORT}`);
});
