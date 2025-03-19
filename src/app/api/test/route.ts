import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic'; // No caching

export async function GET() {
  const startTime = Date.now();
  console.log('API test endpoint called at:', new Date().toISOString());

  try {
    // Safe logging of API key format
    const apiKey = process.env.OPENAI_API_KEY || '';
    const keyLength = apiKey.length;
    const maskedKey = keyLength > 8 
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(keyLength - 4)}` 
      : '(not set)';
    const keyType = apiKey.startsWith('sk-') ? 'Standard' : apiKey.startsWith('sk-proj-') ? 'Project' : 'Unknown';
    const isValidKey = apiKey.startsWith('sk-') && keyLength > 20;

    // Log environment info
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      keyAvailable: Boolean(apiKey),
      keyType,
      keyLength,
      isValidKey
    });

    if (!isValidKey) {
      console.error('Invalid API key format detected');
      return NextResponse.json({ 
        status: 'error',
        message: 'Invalid OpenAI API key format',
        keyInfo: {
          available: Boolean(apiKey),
          type: keyType,
          masked: maskedKey,
          length: keyLength,
          valid: false
        },
        error: 'API key format is invalid'
      }, { status: 500 });
    }

    // Initialize OpenAI client with a shorter timeout for testing
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000, // 15 seconds timeout
      maxRetries: 1,
    });

    // Test the API connection
    console.log("Testing OpenAI API connection...");
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello' }
      ],
      max_tokens: 10,
    });
    
    const elapsed = Date.now() - startTime;
    console.log('API test successful:', {
      elapsed,
      response: response.choices[0].message.content
    });
    
    return NextResponse.json({ 
      status: 'success',
      message: 'OpenAI API connection successful',
      keyInfo: {
        available: true,
        type: keyType,
        masked: maskedKey,
        length: keyLength,
        valid: true
      },
      testResponse: response.choices[0].message.content,
      elapsed: elapsed
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error("API test failed:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      elapsed
    });
    
    return NextResponse.json({ 
      status: 'error',
      message: 'OpenAI API connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      elapsed
    }, { status: 500 });
  }
} 