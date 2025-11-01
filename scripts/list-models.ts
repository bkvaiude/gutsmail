import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
  try {
    console.log('🔍 Fetching available Gemini models...\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );

    const data = await response.json();

    if (data.models) {
      console.log('✅ Available models that support generateContent:\n');

      data.models
        .filter((model: any) =>
          model.supportedGenerationMethods?.includes('generateContent')
        )
        .forEach((model: any) => {
          console.log(`📦 ${model.name}`);
          console.log(`   Display Name: ${model.displayName}`);
          console.log(`   Description: ${model.description}`);
          console.log('');
        });
    } else {
      console.error('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Error fetching models:', error);
  }
}

listModels();
