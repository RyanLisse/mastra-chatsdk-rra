import { ChatSDKError } from '@/lib/errors';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createRoboRailVoiceAgent } from '@/lib/ai/agents/roborail-voice-agent';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { generateUUID } from '@/lib/utils';
import { getMessageCountByUserId } from '@/lib/db/queries';
import {
  createVoiceSession,
  getVoiceSession,
  updateVoiceSessionActivity,
  updateVoiceSessionStatus,
  cleanupInactiveSessions,
  getActiveSessionsByUser,
} from '@/lib/db/queries/voice-sessions';

export const maxDuration = 60;

// Store active voice agent instances in memory (for current request lifecycle only)
const activeAgents = new Map<string, any>();

/**
 * Cleanup handler for serverless environments
 * Called at the end of each request to clean up expired sessions
 */
async function performSessionCleanup() {
  try {
    const expiredSessionIds = await cleanupInactiveSessions();
    
    // Disconnect agents for expired sessions
    for (const sessionId of expiredSessionIds) {
      const agent = activeAgents.get(sessionId);
      if (agent) {
        try {
          await agent.disconnect();
        } catch (error) {
          console.error(`Error disconnecting agent for session ${sessionId}:`, error);
        }
        activeAgents.delete(sessionId);
      }
    }
    
    console.log(`Cleaned up ${expiredSessionIds.length} expired voice sessions`);
  } catch (error) {
    console.error('Error during session cleanup:', error);
  }
}

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

    // Check for existing active sessions and limit per user
    const activeSessions = await getActiveSessionsByUser(session.user.id);
    if (activeSessions.length >= 3) {
      return new ChatSDKError('too_many_sessions:voice').toResponse();
    }

    // Create new voice agent
    const voiceAgent = createRoboRailVoiceAgent({
      sessionId: voiceSessionId,
      model: model || 'gpt-4o-mini-realtime-preview-2024-12-17',
      speaker: speaker || 'alloy',
    });

    // Connect the agent
    await voiceAgent.connect();

    // Store in memory for current request lifecycle
    activeAgents.set(voiceSessionId, voiceAgent);

    // Persist session in database
    await createVoiceSession({
      sessionId: voiceSessionId,
      userId: session.user.id,
      model: model || 'gpt-4o-mini-realtime-preview-2024-12-17',
      speaker: speaker || 'alloy',
      metadata: {
        userAgent: request.headers.get('user-agent'),
        initiatedAt: new Date().toISOString(),
      },
    });

    // Perform cleanup in background (don't await)
    performSessionCleanup().catch(console.error);

    return Response.json({
      sessionId: voiceSessionId,
      status: 'connected',
      message: 'Voice session initialized successfully',
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
      return new ChatSDKError(
        'bad_request:voice_session_required',
      ).toResponse();
    }

    // Get session from database
    const voiceSession = await getVoiceSession(sessionId);
    if (!voiceSession || voiceSession.userId !== session.user.id) {
      return new ChatSDKError('not_found:voice_session').toResponse();
    }

    if (voiceSession.status !== 'active') {
      return new ChatSDKError('session_expired:voice').toResponse();
    }

    // Update last activity
    await updateVoiceSessionActivity(sessionId);

    // Get or recreate agent
    let voiceAgent = activeAgents.get(sessionId);
    if (!voiceAgent) {
      // Recreate agent if not in memory (e.g., after server restart)
      voiceAgent = createRoboRailVoiceAgent({
        sessionId: voiceSession.sessionId,
        model: voiceSession.model,
        speaker: voiceSession.speaker,
      });
      await voiceAgent.connect();
      activeAgents.set(sessionId, voiceAgent);
    }

    // Create a readable stream for real-time voice communication
    const stream = new ReadableStream({
      start(controller) {
        // Set up event handlers for streaming voice data
        const voiceInstance = voiceAgent.getVoiceInstance();

        voiceInstance.on(
          'writing',
          ({ text, role }: { text: string; role: string }) => {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'transcription',
                  text,
                  role,
                  sessionId,
                })}\n\n`,
              ),
            );
          },
        );

        voiceInstance.on('speaker', ({ audio }: { audio: any }) => {
          try {
            // Validate audio buffer before accessing properties
            if (!audio || typeof audio !== 'object') {
              console.warn(`Invalid audio data received for session ${sessionId}`);
              return;
            }

            const audioLength = audio?.length || 0;
            console.log(
              `Voice audio received: ${audioLength} bytes for session ${sessionId}`,
            );

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'audio',
                  audioLength,
                  sessionId,
                })}\n\n`,
              ),
            );
          } catch (error) {
            console.error('Error processing speaker audio:', error);
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  error: 'Failed to process audio data',
                  sessionId,
                })}\n\n`,
              ),
            );
          }
        });

        voiceInstance.on('error', (error: any) => {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error.message,
                sessionId,
              })}\n\n`,
            ),
          );
        });

        voiceInstance.on('disconnect', () => {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'disconnect',
                sessionId,
              })}\n\n`,
            ),
          );
          controller.close();
        });

        // Send initial connection confirmation
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: 'connected',
              sessionId,
              message: 'Voice stream established',
            })}\n\n`,
          ),
        );
      },

      async cancel() {
        // Clean up when stream is cancelled
        try {
          await updateVoiceSessionStatus(sessionId, 'disconnected');
          const agent = activeAgents.get(sessionId);
          if (agent) {
            await agent.disconnect().catch(console.error);
            activeAgents.delete(sessionId);
          }
        } catch (error) {
          console.error('Error during stream cancellation:', error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error establishing voice stream:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  } finally {
    // Perform cleanup in background
    performSessionCleanup().catch(console.error);
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
      return new ChatSDKError(
        'bad_request:voice_session_required',
      ).toResponse();
    }

    // Get session from database
    const voiceSession = await getVoiceSession(sessionId);
    if (!voiceSession || voiceSession.userId !== session.user.id) {
      return new ChatSDKError('not_found:voice_session').toResponse();
    }

    if (voiceSession.status !== 'active') {
      return new ChatSDKError('session_expired:voice').toResponse();
    }

    // Update last activity
    await updateVoiceSessionActivity(sessionId);

    // Get or recreate agent
    let voiceAgent = activeAgents.get(sessionId);
    if (!voiceAgent) {
      voiceAgent = createRoboRailVoiceAgent({
        sessionId: voiceSession.sessionId,
        model: voiceSession.model,
        speaker: voiceSession.speaker,
      });
      await voiceAgent.connect();
      activeAgents.set(sessionId, voiceAgent);
    }

    switch (action) {
      case 'speak':
        if (!text) {
          return new ChatSDKError('bad_request:text_required').toResponse();
        }
        await voiceAgent.speak(text);
        break;

      case 'sendAudio': {
        if (!audioData) {
          return new ChatSDKError('bad_request:audio_required').toResponse();
        }
        
        try {
          // Convert base64 audio data to buffer with validation
          const audioBuffer = Buffer.from(audioData, 'base64');
          
          // Validate buffer before creating Int16Array
          if (!audioBuffer || audioBuffer.length === 0) {
            return new ChatSDKError('bad_request:invalid_audio_data').toResponse();
          }
          
          // Ensure buffer length is even for Int16Array
          if (audioBuffer.length % 2 !== 0) {
            return new ChatSDKError('bad_request:invalid_audio_format').toResponse();
          }
          
          // Create Int16Array with proper validation
          const audioArray = new Int16Array(
            audioBuffer.buffer.slice(
              audioBuffer.byteOffset,
              audioBuffer.byteOffset + audioBuffer.length
            )
          );
          
          await voiceAgent.sendAudio(audioArray);
        } catch (error) {
          console.error('Error processing audio data:', error);
          return new ChatSDKError('bad_request:audio_processing_failed').toResponse();
        }
        break;
      }

      case 'listen': {
        if (!audioData) {
          return new ChatSDKError('bad_request:audio_required').toResponse();
        }
        
        try {
          // Convert base64 audio data to ReadableStream for listening
          const listenBuffer = Buffer.from(audioData, 'base64');
          
          // Validate buffer
          if (!listenBuffer || listenBuffer.length === 0) {
            return new ChatSDKError('bad_request:invalid_audio_data').toResponse();
          }
          
          const listenStream = new ReadableStream({
            start(controller) {
              controller.enqueue(listenBuffer);
              controller.close();
            },
          });
          await voiceAgent.listen(listenStream);
        } catch (error) {
          console.error('Error processing listen audio:', error);
          return new ChatSDKError('bad_request:audio_processing_failed').toResponse();
        }
        break;
      }

      default:
        return new ChatSDKError('bad_request:invalid_action').toResponse();
    }

    return Response.json({
      sessionId,
      action,
      status: 'success',
    });
  } catch (error) {
    console.error('Error handling voice action:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  } finally {
    // Perform cleanup in background
    performSessionCleanup().catch(console.error);
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
      return new ChatSDKError(
        'bad_request:voice_session_required',
      ).toResponse();
    }

    // Get session from database
    const voiceSession = await getVoiceSession(sessionId);
    if (voiceSession && voiceSession.userId === session.user.id) {
      // Update status in database
      await updateVoiceSessionStatus(sessionId, 'disconnected');
      
      // Disconnect agent if exists
      const agent = activeAgents.get(sessionId);
      if (agent) {
        await agent.disconnect();
        activeAgents.delete(sessionId);
      }
    }

    return Response.json({
      sessionId,
      status: 'disconnected',
      message: 'Voice session terminated successfully',
    });
  } catch (error) {
    console.error('Error disconnecting voice session:', error);
    return new ChatSDKError('bad_request:api').toResponse();
  } finally {
    // Perform cleanup in background
    performSessionCleanup().catch(console.error);
  }
}