'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import { useVoiceAssistant } from '@/hooks/use-voice-assistant';
import { VoiceStatus } from './voice-status';
import { VoicePermissions } from './voice-permissions';
import { ChatErrorBoundary } from './ui/error-boundary';
import { LoadingOverlay } from './ui/loading-indicators';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { mutate } = useSWRConfig();

  // Generate and manage sessionId for conversation context persistence
  const sessionIdRef = useRef<string | null>(null);

  // Initialize sessionId on mount
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateUUID();
    }
  }, []);

  // Function to reset session for new conversations
  const resetSession = () => {
    sessionIdRef.current = generateUUID();
  };

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    fetch: fetchWithErrorHandlers,
    experimental_prepareRequestBody: (body) => ({
      id,
      message: body.messages.at(-1),
      selectedChatModel: initialChatModel,
      selectedVisibilityType: visibilityType,
      sessionId: sessionIdRef.current,
    }),
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');

  // Voice assistant integration
  const voiceAssistant = useVoiceAssistant({
    sessionId: sessionIdRef.current || '',
    onTranscription: (text: string, role: string) => {
      if (role === 'user') {
        setCurrentTranscription(text);
        // Auto-submit when user stops talking (could be enhanced with silence detection)
        setInput(text);
      } else if (role === 'assistant') {
        // Handle assistant transcription if needed
        console.log('Assistant transcription:', text);
      }
    },
    onError: (error: string) => {
      toast({
        type: 'error',
        description: `Voice error: ${error}`,
      });
    },
    onAudioReceived: (audioLength: number) => {
      console.log('Received audio of length:', audioLength);
    },
  });

  // Auto submit transcribed text when recording stops
  useEffect(() => {
    if (
      !voiceAssistant.isRecording &&
      currentTranscription &&
      currentTranscription.trim()
    ) {
      // Add a small delay to ensure transcription is complete
      const timer = setTimeout(() => {
        if (status === 'ready' && currentTranscription.trim()) {
          append({
            role: 'user',
            content: currentTranscription.trim(),
          });
          setCurrentTranscription('');
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [voiceAssistant.isRecording, currentTranscription, append, status]);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  return (
    <ChatErrorBoundary
      onRetry={() => {
        if (messages.length > 0) {
          reload();
        }
      }}
    >
      <div className="flex flex-col min-w-0 h-dvh bg-background relative">
        {/* Global loading overlay for chat operations */}
        <LoadingOverlay
          isVisible={status === 'submitted' && messages.length === 0}
          message="Starting conversation..."
        />
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
          onResetSession={resetSession}
        />

        {sessionIdRef.current && (
          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/50 border-b">
            Memory Active: Session {sessionIdRef.current.slice(-8)}
          </div>
        )}

        {/* Voice Permissions and Status */}
        <div className="px-4 py-2 space-y-2">
          {voiceAssistant.permissionStatus !== 'granted' && (
            <VoicePermissions
              onPermissionGranted={() => {
                // Auto-connect when permission is granted
                if (!voiceAssistant.isConnected) {
                  voiceAssistant.connect();
                }
              }}
            />
          )}

          <div className="flex justify-center">
            <VoiceStatus
              state={voiceAssistant.state}
              isConnected={voiceAssistant.isConnected}
              isRecording={voiceAssistant.isRecording}
              currentTranscription={currentTranscription}
              error={voiceAssistant.error}
            />
          </div>
        </div>

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedVisibilityType={visibilityType}
              voiceAssistant={voiceAssistant}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </ChatErrorBoundary>
  );
}
