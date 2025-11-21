import 'dotenv/config';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY が設定されていません');
  process.exit(1);
}

console.log('🧪 REST API で各モデルをテスト中...\n');

const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
];

for (const modelId of modelsToTest) {
  try {
    console.log(`テスト中: ${modelId}`);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'こんにちは' }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ 失敗: ${response.status}`);
      console.log(errorText.substring(0, 200));
    } else {
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`✅ 成功! レスポンス: ${text.substring(0, 50)}...`);
      console.log(`\n🎯 このモデルが使用できます: ${modelId}\n`);
      console.log(`📝 .envファイルに以下を設定してください:`);
      console.log(`GEMINI_MODEL_ID=${modelId}\n`);
      break;
    }
  } catch (error) {
    console.log(`❌ エラー: ${error.message}`);
  }
  console.log();
}
