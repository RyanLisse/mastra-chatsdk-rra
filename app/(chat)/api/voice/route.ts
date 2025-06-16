// app/(chat)/api/voice/route.ts
import { auth } from '@/app/(auth)/auth';
import { createRoboRailVoiceAgent } from '@/lib/ai/agents/roborail-voice-agent';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { getMessageCountByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { generateUUID } from '@/lib/utils';
import { NextRequest } from 'next/server';

export const maxDuration = 60;

// Store active voice sessions
const activeSessions = new Map<string, { agent: any; lastActivity: number }>();

// Clean up inactive sessions periodically
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > TIMEOUT) {
      session.agent.disconnect().catch(console.error);
      activeSessions.delete(sessionId);
      console.log(`Cleaned up inactive voice session: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

/**
 * Initialize a new voice session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:voice').toResponse();
    }

    // Check rate limits
    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    const userType = session.user.type;
    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:voice').toResponse();
    }

    const { sessionId, model, speaker } = await request.json();
    const voiceSessionId = sessionId || `voice-${generateUUID()}`;

    // Create new voice agent
    const voiceAgent = createRoboRailVoiceAgent({
      sessionId: voiceSessionId,
      model: model || 'gpt-4o-mini-realtime-preview-2024-12-17',
      speaker: speaker || 'alloy'
    });

    // Connect the agent
    await voiceAgent.connect();

    // Store the session
    activeSessions.set(voiceSessionId, {
      agent: voiceAgent,
      lastActivity: Date.now()
    });

    return Response.json({
      sessionId: voiceSessionId,
      status: 'connected',
      message: 'Voice session initialized successfully'
    });

  } catch (error) {
    console.error('Error initializing voice session:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

/**
 * Handle voice interactions via WebSocket-like streaming
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:voice').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new ChatSDKError('bad_request:voice_session_required').toResponse();
    }

    const voiceSession = activeSessions.get(sessionId);
    if (!voiceSession) {
      return new ChatSDKError('not_found:voice_session').toResponse();
    }

    // Update last activity
    voiceSession.lastActivity = Date.now();

    // Create a readable stream for real-time voice communication
    const stream = new ReadableStream({
      start(controller) {
        const voiceAgent = voiceSession.agent;

        // Set up event handlers for streaming voice data
        const voiceInstance = voiceAgent.getVoiceInstance();

        voiceInstance.on('writing', ({ text, role }: { text: string; role: string }) => {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ 
              type: 'transcription', 
              text, 
              role, 
              sessionId 
            })}\n\n`
          ));
        });

        voiceInstance.on('speaker', ({ audio }: { audio: any }) => {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ 
              type: 'audio', 
              audioLength: audio.length, 
              sessionId 
            })}\n\n`
          ));
        });

        voiceInstance.on('error', (error: any) => {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ 
              type: 'error', 
              error: error.message, 
              sessionId 
            })}\n\n`
          ));
        });

        voiceInstance.on('disconnect', () => {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ 
              type: 'disconnect', 
              sessionId 
            })}\n\n`
          ));
          controller.close();
        });

        // Send initial connection confirmation
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ 
            type: 'connected', 
            sessionId,
            message: 'Voice stream established' 
          })}\n\n`
        ));
      },

      cancel() {
        // Clean up when stream is cancelled
        const voiceSession = activeSessions.get(sessionId);
        if (voiceSession) {
          voiceSession.agent.disconnect().catch(console.error);
          activeSessions.delete(sessionId);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error establishing voice stream:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

/**
 * Send audio data to voice session
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:voice').toResponse();
    }

    const { sessionId, action, audioData, text } = await request.json();

    if (!sessionId) {
      return new ChatSDKError('bad_request:voice_session_required').toResponse();
    }

    const voiceSession = activeSessions.get(sessionId);
    if (!voiceSession) {
      return new ChatSDKError('not_found:voice_session').toResponse();
    }

    // Update last activity
    voiceSession.lastActivity = Date.now();
    const voiceAgent = voiceSession.agent;

    switch (action) {
      case 'speak':
        if (!text) {
          return new ChatSDKError('bad_request:text_required').toResponse();
        }
        await voiceAgent.speak(text);
        break;

      case 'sendAudio':
        if (!audioData) {
          return new ChatSDKError('bad_request:audio_required').toResponse();
        }
        // Convert base64 audio data to Int16Array
        const audioBuffer = Buffer.from(audioData, 'base64');
        const audioArray = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2);
        await voiceAgent.sendAudio(audioArray);
        break;

      case 'listen':
        if (!audioData) {
          return new ChatSDKError('bad_request:audio_required').toResponse();
        }
        // Convert base64 audio data to ReadableStream for listening
        const listenBuffer = Buffer.from(audioData, 'base64');
        const listenStream = new ReadableStream({
          start(controller) {
            controller.enqueue(listenBuffer);
            controller.close();
          }
        });
        await voiceAgent.listen(listenStream);
        break;

      default:
        return new ChatSDKError('bad_request:invalid_action').toResponse();
    }

    return Response.json({
      sessionId,
      action,
      status: 'success'
    });

  } catch (error) {
    console.error('Error handling voice action:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}

/**
 * Disconnect voice session
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:voice').toResponse();
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new ChatSDKError('bad_request:voice_session_required').toResponse();
    }

    const voiceSession = activeSessions.get(sessionId);
    if (voiceSession) {
      await voiceSession.agent.disconnect();
      activeSessions.delete(sessionId);
    }

    return Response.json({
      sessionId,
      status: 'disconnected',
      message: 'Voice session terminated successfully'
    });

  } catch (error) {
    console.error('Error disconnecting voice session:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  }
}