import { DatabaseConnectionManager } from '../connection-manager';
import { voiceSessions } from '../schema';
import { eq, and, lt } from 'drizzle-orm';
import type { VoiceSession } from '../schema';

// Database connection management
const CONNECTION_NAME = 'voice-sessions';

// Get database connection using connection manager
function getDatabase() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const { db } = DatabaseConnectionManager.getConnection(CONNECTION_NAME, {
    url: process.env.POSTGRES_URL,
    max: 10,
    idle_timeout: 20,
    max_lifetime: 1800,
    prepare: false,
    onnotice: () => {}, // Suppress notices in logs
  });

  return db;
}

export async function createVoiceSession({
  sessionId,
  userId,
  model,
  speaker,
  metadata,
}: {
  sessionId: string;
  userId: string;
  model: string;
  speaker: string;
  metadata?: any;
}): Promise<VoiceSession> {
  const db = getDatabase();
  const [session] = await db
    .insert(voiceSessions)
    .values({
      sessionId,
      userId,
      model,
      speaker,
      metadata,
      lastActivity: new Date(),
    })
    .returning();

  return session;
}

export async function getVoiceSession(
  sessionId: string,
): Promise<VoiceSession | null> {
  const db = getDatabase();
  const [session] = await db
    .select()
    .from(voiceSessions)
    .where(eq(voiceSessions.sessionId, sessionId))
    .limit(1);

  return session || null;
}

export async function updateVoiceSessionActivity(
  sessionId: string,
): Promise<void> {
  const db = getDatabase();
  await db
    .update(voiceSessions)
    .set({
      lastActivity: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(voiceSessions.sessionId, sessionId));
}

export async function updateVoiceSessionStatus(
  sessionId: string,
  status: 'active' | 'disconnected' | 'expired',
): Promise<void> {
  const db = getDatabase();
  await db
    .update(voiceSessions)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(voiceSessions.sessionId, sessionId));
}

export async function deleteVoiceSession(sessionId: string): Promise<void> {
  const db = getDatabase();
  await db.delete(voiceSessions).where(eq(voiceSessions.sessionId, sessionId));
}

export async function cleanupInactiveSessions(
  inactivityThresholdMs: number = 30 * 60 * 1000, // 30 minutes default
): Promise<string[]> {
  const db = getDatabase();
  const thresholdDate = new Date(Date.now() - inactivityThresholdMs);

  const inactiveSessions = await db
    .select()
    .from(voiceSessions)
    .where(
      and(
        eq(voiceSessions.status, 'active'),
        lt(voiceSessions.lastActivity, thresholdDate),
      ),
    );

  const sessionIds = inactiveSessions.map((session) => session.sessionId);

  if (sessionIds.length > 0) {
    await db
      .update(voiceSessions)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(voiceSessions.status, 'active'),
          lt(voiceSessions.lastActivity, thresholdDate),
        ),
      );
  }

  return sessionIds;
}

export async function getActiveSessionsByUser(
  userId: string,
): Promise<VoiceSession[]> {
  const db = getDatabase();
  return db
    .select()
    .from(voiceSessions)
    .where(
      and(eq(voiceSessions.userId, userId), eq(voiceSessions.status, 'active')),
    );
}