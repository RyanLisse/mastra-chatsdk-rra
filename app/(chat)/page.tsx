import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { isTestEnvironment } from '@/lib/constants';

export default async function Page() {
  const session = await auth();

  if (!session) {
    // During tests, create a mock session to avoid redirect loops
    if (isTestEnvironment) {
      console.log('Test environment: creating mock session instead of redirecting to guest auth');
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'guest-test',
          type: 'guest' as const,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const id = generateUUID();
      const cookieStore = await cookies();
      const modelIdFromCookie = cookieStore.get('chat-model');

      return (
        <>
          <Chat
            key={id}
            id={id}
            initialMessages={[]}
            initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
            initialVisibilityType="private"
            isReadonly={false}
            session={mockSession}
            autoResume={false}
          />
          <DataStreamHandler id={id} />
        </>
      );
    }

    redirect('/api/auth/guest');
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType="private"
          isReadonly={false}
          session={session}
          autoResume={false}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={modelIdFromCookie.value}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
