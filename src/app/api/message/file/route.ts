import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');

async function cleanUploadsDir() {
  try {
    await fs.access(uploadDir);
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning uploads directory:', error);
  }
}

export async function POST(request: Request) {
  try {
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const message = formData.get('message') as string | null;
    const apiKey = formData.get('apiKey') as string | null;

    if (!file || !message || !apiKey) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: {
            file: !file ? 'No file provided' : null,
            message: !message ? 'No message provided' : null,
            apiKey: !apiKey ? 'No API key provided' : null
          }
        },
        { status: 400 }
      );
    }

    // Create unique filename and save file
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filePath = path.join(uploadDir, `${uniqueSuffix}-${file.name}`);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    try {
      const openaiClient = new OpenAI({ apiKey });
      let responseData = {};

      if (file.type.startsWith('image/')) {
        const imageBuffer = await fs.readFile(filePath);
        const base64Image = imageBuffer.toString('base64');

        const completion = await openaiClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: message },
            {
              role: "user",
              content: [
                { type: "text", text: message },
                {
                  type: "image_url",
                  image_url: { url: `data:${file.type};base64,${base64Image}` }
                }
              ]
            }
          ],
        });

        responseData = {
          botResponse: completion.choices[0].message.content,
          image: { data: base64Image, type: file.type, name: file.name }
        };
      } else {
        const fileBuffer = await fs.readFile(filePath);
        const fileBinary = fileBuffer.toString('binary');

        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: `${message}\n\nFile content in binary format: ${fileBinary}` },
          ],
        });

        responseData = { botResponse: completion.choices[0].message.content };
      }

      await cleanUploadsDir();
      return NextResponse.json(responseData);
    } catch (error) {
      await cleanUploadsDir();
      throw error;
    }
  } catch (error) {
    console.error('Server error:', error);
    await cleanUploadsDir();
    return NextResponse.json(
      { 
        error: 'Server error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};