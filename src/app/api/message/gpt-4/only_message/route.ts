import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function POST(request: Request) {
  try {
    // Get form data from the request
    const formData = await request.formData();
    const message = formData.get('message') as string | null;
    const apiKey = formData.get('apiKey') as string | null;

    // Validate required fields
    if (!message || !apiKey) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: {
            message: message ? null : 'No message provided',
            apiKey: apiKey ? null : 'No API key provided',
          }
        },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openaiClient = new OpenAI({ apiKey });

    // Call OpenAI API
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message },
      ],
    });

    // Return successful response
    return NextResponse.json({
      botResponse: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error('Error processing message:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}