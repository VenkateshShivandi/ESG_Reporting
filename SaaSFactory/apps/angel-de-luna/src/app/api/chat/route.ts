import { NextResponse } from 'next/server';
import { AssistantService } from '@theamiteshtripathi/assistant-api';

const assistantService = new AssistantService(process.env.OPENAI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    
    const assistantId = await assistantService.getOrCreateAssistant({
      name: 'Dr. Angel E. de Luna'
    });

    const thread = await assistantService.createThread();
    const response = await assistantService.sendMessage(thread.id, assistantId, message);
    
    return NextResponse.json({ message: response, threadId: thread.id });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 