import 'dotenv/config';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY が設定されていません');
  process.exit(1);
}

console.log('🔍 利用可能なモデルをリストアップ中...\n');

try {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ エラー: ${response.status}`);
    console.error(errorText);
    process.exit(1);
  }
  
  const result = await response.json();
  
  if (!result.models || result.models.length === 0) {
    console.log('⚠️ モデルが見つかりませんでした');
    console.log('APIの有効化が完全に反映されるまで、さらに数分待つ必要があるかもしれません。');
    process.exit(0);
  }
  
  console.log(`✅ ${result.models.length} 個のモデルが見つかりました:\n`);
  
  for (const model of result.models) {
    const supportsGenerate = model.supportedGenerationMethods?.includes('generateContent');
    const icon = supportsGenerate ? '✓' : '✗';
    const modelName = model.name.replace('models/', '');
    
    console.log(`${icon} ${modelName}`);
    if (model.displayName) {
      console.log(`   表示名: ${model.displayName}`);
    }
    if (supportsGenerate) {
      console.log(`   ✅ generateContent をサポート`);
    }
    console.log();
  }
  
  // 推奨モデルを表示
  const generateModels = result.models.filter(m => 
    m.supportedGenerationMethods?.includes('generateContent')
  );
  
  if (generateModels.length > 0) {
    console.log('\n📌 推奨設定:\n');
    const firstModel = generateModels[0].name.replace('models/', '');
    console.log(`GEMINI_MODEL_ID=${firstModel}`);
    console.log(`\nこの値を .env ファイルに設定してください。\n`);
  }
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  process.exit(1);
}
