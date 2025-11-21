import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY が設定されていません');
  process.exit(1);
}

console.log('🧪 各モデルをテスト中...\n');

const modelsToTest = [
  'gemini-1.5-flash-002',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash-8b',
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'models/gemini-pro',
  'models/gemini-1.5-pro',
  'models/gemini-1.5-flash',
];

const genAI = new GoogleGenerativeAI(apiKey);

for (const modelId of modelsToTest) {
  try {
    console.log(`テスト中: ${modelId}`);
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContent('こんにちは');
    const text = result.response.text();
    console.log(`✅ 成功! レスポンス: ${text.substring(0, 50)}...`);
    console.log(`\n🎯 このモデルが使用できます: ${modelId}\n`);
    console.log(`📝 .envファイルに以下を設定してください:`);
    console.log(`GEMINI_MODEL_ID=${modelId}\n`);
    break;
  } catch (error) {
    console.log(`❌ 失敗:`);
    console.log(error.message);
  }
  console.log();
}
