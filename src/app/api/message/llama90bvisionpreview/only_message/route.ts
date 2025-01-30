// src/app/api/message/deepseek/only_message/route.ts
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    // Parse the form data
    const formData = await request.formData();
    const message = formData.get('message') as string;

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Create chat completion
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      model: "llama-3.2-90b-vision-preview",
      temperature: 0.6,
      top_p: 0.95,
      stream: false
    });

    const rawResponse = chatCompletion.choices[0]?.message?.content;
    
    if (!rawResponse) {
      return NextResponse.json({ 
        error: 'No response received from DeepSeek R1',
        details: 'Empty or null response from the AI'
      }, { status: 500 });
    }

    // Process and clean the response
    const cleanedResponse = rawResponse
      .replace(/<userStyle>.*?<\/userStyle>/g, '') // Remove <userStyle> tags
      .replace(/<think>.*?<\/think>/g, '') // Remove <think> tags
      .replace(/<[^>]*>/g, '') // Remove any other XML-like tags
      .replace(/^\s*[\r\n]+/gm, '') // Remove empty lines
      .trim(); // Remove leading/trailing whitespace

    // Fallback if response becomes empty
    const finalResponse = cleanedResponse || 'I apologize, but I couldn\'t generate a meaningful response.';

    // Return the processed response
    return NextResponse.json({
      botResponse: finalResponse
    });

  } catch (error) {
    console.error('DeepSeek R1 Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process message with DeepSeek R1' 
    }, { status: 500 });
  }
}