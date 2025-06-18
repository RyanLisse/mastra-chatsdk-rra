/**
 * Mock database implementation for testing
 * This ensures tests run even when a real database is unavailable
 */

export class MockDatabase {
  private storage: Map<string, any> = new Map();

  async query(sql: string, params?: any[]): Promise<any> {
    console.log(`[MockDatabase] Query: ${sql}`);
    
    // Handle common queries with mock responses
    if (sql.toLowerCase().includes('select')) {
      return { rows: [], rowCount: 0 };
    }
    
    if (sql.toLowerCase().includes('insert')) {
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    
    if (sql.toLowerCase().includes('update')) {
      return { rows: [], rowCount: 1 };
    }
    
    if (sql.toLowerCase().includes('delete')) {
      return { rows: [], rowCount: 1 };
    }
    
    return { rows: [], rowCount: 0 };
  }

  async connect(): Promise<void> {
    console.log('[MockDatabase] Connected');
  }

  async disconnect(): Promise<void> {
    console.log('[MockDatabase] Disconnected');
  }

  // Memory storage methods
  async get(key: string): Promise<any> {
    return this.storage.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

export const createMockDatabaseUrl = () => {
  return 'mock://localhost:5432/testdb';
};