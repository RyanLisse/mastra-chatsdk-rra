import { expect as baseExpected, test as baseTest } from '@playwright/test';
import { createAuthenticatedContext, type UserContext } from './helpers';
import { getUnixTime } from 'date-fns';
import { cleanupTestConnections } from '../lib/db/cleanup';

// Validate test environment
if (process.env.NODE_ENV !== 'test' && process.env.PLAYWRIGHT !== 'true') {
  console.warn(
    '⚠️  Test environment not properly configured. Set NODE_ENV=test or PLAYWRIGHT=true',
  );
}

// Add test isolation cleanup
baseTest.afterEach(async () => {
  try {
    await cleanupTestConnections();
  } catch (error) {
    console.warn('Warning: Test cleanup failed:', error);
  }
});

const baseExpect = baseExpected;

interface Fixtures {
  adaContext: UserContext;
  babbageContext: UserContext;
  curieContext: UserContext;
}

export const test = baseTest.extend<{}, Fixtures>({
  adaContext: [
    async ({ browser }, use, workerInfo) => {
      const ada = await createAuthenticatedContext({
        browser,
        name: `ada-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
      });

      await use(ada);
      await ada.context.close();
    },
    { scope: 'worker' },
  ],
  babbageContext: [
    async ({ browser }, use, workerInfo) => {
      const babbage = await createAuthenticatedContext({
        browser,
        name: `babbage-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
      });

      await use(babbage);
      await babbage.context.close();
    },
    { scope: 'worker' },
  ],
  curieContext: [
    async ({ browser }, use, workerInfo) => {
      const curie = await createAuthenticatedContext({
        browser,
        name: `curie-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
        chatModel: 'chat-model-reasoning',
      });

      await use(curie);
      await curie.context.close();
    },
    { scope: 'worker' },
  ],
});

export const expect = baseExpect;
