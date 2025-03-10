import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic'; // No caching

export async function GET() {
  // Safe logging of API key format
  const apiKey = process.env.OPENAI_API_KEY || '';
  const keyLength = apiKey.length;
  const maskedKey = keyLength > 8 
    ? `${apiKey.substring(0, 4)}...${apiKey.substring(keyLength - 4)}` 
    : '(not set)';
  const keyType = apiKey.startsWith('sk-') ? 'Standard' : apiKey.startsWith('sk-proj-') ? 'Project' : 'Unknown';

  // Initialize OpenAI client with a shorter timeout for testing
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 15000, // 15 seconds timeout
    maxRetries: 1,
  });

  // Test the API connection
  try {
    console.log("Testing OpenAI API connection from /api/test endpoint...");
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello' }
      ],
      max_tokens: 10,
    });
    
    const elapsed = Date.now() - startTime;
    
    return NextResponse.json({ 
      status: 'success',
      message: 'OpenAI API connection successful',
      keyInfo: {
        available: true,
        type: keyType,
        masked: maskedKey,
        length: keyLength
      },
      testResponse: response.choices[0].message.content,
      elapsed: elapsed
    });
  } catch (error) {
    console.error("API test failed:", error);
    
    return NextResponse.json({ 
      status: 'error',
      message: 'OpenAI API connection failed',
      keyInfo: {
        available: Boolean(apiKey),
        type: keyType,
        masked: maskedKey,
        length: keyLength
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 