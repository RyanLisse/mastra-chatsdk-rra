// app/api/save-message/route.ts
import { auth } from '@/app/(auth)/auth';
import { PostgresMemory } from '@/lib/mastra/memory';
import { ChatSDKError } from '@/lib/errors';
import { generateUUID } from '@/lib/utils';
import { NextRequest } from 'next/server';
import type { Message } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

// Schema for request validation
const saveMessageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  message: z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1, 'Message content is required'),
  }),
});

type SaveMessageRequest = z.infer<typeof saveMessageSchema>;

/**
 * Save assistant messages to PostgreSQL memory for text-based chats
 * This API helps integrate voice responses into the text chat system
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:save_message').toResponse();
    }

    let requestBody: SaveMessageRequest;

    try {
      const json = await request.json();
      requestBody = saveMessageSchema.parse(json);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return new ChatSDKError('bad_request:invalid_message_data').toResponse();
    }

    const { sessionId, message: messageData } = requestBody;

    // Create a properly formatted Message object
    const message: Message = {
      id: messageData.id || generateUUID(),
      role: messageData.role,
      content: messageData.content,
    };

    // Validate the message structure
    if (!message.id || !message.role || !message.content) {
      return new ChatSDKError('bad_request:incomplete_message').toResponse();
    }

    // Save the message to PostgreSQL memory
    try {
      await PostgresMemory.addMessage({
        sessionId,
        message,
      });

      return Response.json({
        success: true,
        sessionId,
        messageId: message.id,
        message: 'Message saved successfully',
      });
    } catch (memoryError) {
      console.error('Error saving message to memory:', memoryError);
      return new ChatSDKError('internal_error:memory_save_failed').toResponse();
    }
  } catch (error) {
    console.error('Error in save-message API:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

/**
 * Get conversation history for a session
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:save_message').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new ChatSDKError('bad_request:session_id_required').toResponse();
    }

    try {
      const history = await PostgresMemory.getHistory({ sessionId });

      return Response.json({
        success: true,
        sessionId,
        messages: history,
        count: history.length,
      });
    } catch (memoryError) {
      console.error('Error retrieving conversation history:', memoryError);
      return new ChatSDKError('internal_error:memory_read_failed').toResponse();
    }
  } catch (error) {
    console.error('Error in save-message GET API:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

/**
 * Clear conversation history for a session (useful for testing)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:save_message').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new ChatSDKError('bad_request:session_id_required').toResponse();
    }

    try {
      await PostgresMemory.clearSession({ sessionId });

      return Response.json({
        success: true,
        sessionId,
        message: 'Session cleared successfully',
      });
    } catch (memoryError) {
      console.error('Error clearing session:', memoryError);
      return new ChatSDKError('internal_error:memory_clear_failed').toResponse();
    }
  } catch (error) {
    console.error('Error in save-message DELETE API:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}