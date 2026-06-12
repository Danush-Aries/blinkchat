import * as SQLite from 'expo-sqlite';
import { create } from 'zustand';

export interface Message {
  id: string;
  thread_id: string;
  from_pubkey: string;
  to_pubkey: string;
  group_id: string | null;
  plaintext: string;
  timestamp: number;
  ttl_seconds: number | null;
  expires_at: number | null;
  delivery_status: 'sent' | 'relayed' | 'delivered';
}

export interface Thread {
  id: string;
  peer_pubkey: string;
  nickname: string;
  last_message: string;
  last_timestamp: number;
}

class Database {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await SQLite.openDatabaseAsync('blinkchat.db');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        from_pubkey TEXT NOT NULL,
        to_pubkey TEXT NOT NULL,
        group_id TEXT,
        plaintext TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl_seconds INTEGER,
        expires_at INTEGER,
        delivery_status TEXT NOT NULL DEFAULT 'sent'
      );

      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        peer_pubkey TEXT NOT NULL,
        nickname TEXT NOT NULL DEFAULT 'Unknown',
        last_message TEXT NOT NULL DEFAULT '',
        last_timestamp INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS outbox_queue (
        id TEXT PRIMARY KEY,
        packet_payload TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      );
    `);

    // Purge expired messages every minute
    setInterval(() => this.deleteExpiredMessages(), 60000);
  }

  /**
   * Insert a message and atomically upsert the parent thread row.
   * Without the thread upsert, HomeScreen would always show an empty list.
   */
  async insertMessage(msg: Message): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    const _db = this.db;

    await _db.withTransactionAsync(async () => {
      // 1. Insert the message
      await _db.runAsync(
        `INSERT OR REPLACE INTO messages
          (id, thread_id, from_pubkey, to_pubkey, group_id, plaintext,
           timestamp, ttl_seconds, expires_at, delivery_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          msg.id,
          msg.thread_id,
          msg.from_pubkey,
          msg.to_pubkey,
          msg.group_id ?? null,
          msg.plaintext,
          msg.timestamp,
          msg.ttl_seconds ?? null,
          msg.expires_at ?? null,
          msg.delivery_status,
        ]
      );

      // 2. Upsert thread — peer is the other party relative to sender
      const peerPubkey =
        msg.from_pubkey === msg.thread_id ? msg.to_pubkey : msg.from_pubkey;

      await _db.runAsync(
        `INSERT INTO threads (id, peer_pubkey, nickname, last_message, last_timestamp)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           last_message   = excluded.last_message,
           last_timestamp = excluded.last_timestamp
         WHERE excluded.last_timestamp >= threads.last_timestamp`,
        [
          msg.thread_id,
          peerPubkey,
          'Unknown', // Nickname will be set when the user adds a contact
          msg.plaintext.length > 60
            ? msg.plaintext.substring(0, 60) + '…'
            : msg.plaintext,
          msg.timestamp,
        ]
      );

      // 3. Enqueue for outbound delivery retry
      await _db.runAsync(
        `INSERT OR IGNORE INTO outbox_queue
          (id, packet_payload, retry_count, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          msg.id,
          JSON.stringify({
            id: msg.id,
            recipient: msg.to_pubkey,
            payload: msg.plaintext,
          }),
          0,
          msg.timestamp,
          msg.expires_at ?? null,
        ]
      );
    });
  }

  async queuePacket(payload: string, expiresAt: number): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync(
      `INSERT INTO outbox_queue (id, packet_payload, retry_count, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Math.random().toString(36).substring(2, 10),
        payload,
        0,
        Date.now(),
        expiresAt,
      ]
    );
  }

  async popNextQueueItem(): Promise<
    { id: string; packet_payload: string } | null | undefined
  > {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getFirstAsync<{ id: string; packet_payload: string }>(
      'SELECT id, packet_payload FROM outbox_queue ORDER BY created_at ASC LIMIT 1'
    );
  }

  async acknowledgeQueueItem(id: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync('DELETE FROM outbox_queue WHERE id = ?', [id]);
  }

  async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync(
      'UPDATE outbox_queue SET retry_count = retry_count + 1 WHERE id = ?',
      [id]
    );
  }

  async getMessagesByThread(threadId: string): Promise<Message[]> {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getAllAsync<Message>(
      'SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC',
      [threadId]
    );
  }

  async updateDeliveryStatus(
    messageId: string,
    status: Message['delivery_status']
  ): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync(
      'UPDATE messages SET delivery_status = ? WHERE id = ?',
      [status, messageId]
    );
  }

  async updateThreadNickname(threadId: string, nickname: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.runAsync(
      'UPDATE threads SET nickname = ? WHERE id = ?',
      [nickname, threadId]
    );
  }

  async deleteExpiredMessages(): Promise<void> {
    if (!this.db) return;
    const now = Date.now();
    await this.db.runAsync(
      'DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < ?',
      [now]
    );
    await this.db.runAsync(
      'DELETE FROM outbox_queue WHERE expires_at IS NOT NULL AND expires_at < ?',
      [now]
    );
  }

  /**
   * Panic wipe: drops all tables to erase conversation history.
   * Called from ChatScreen triple-tap or IdentityScreen PIN 0000.
   */
  async panicWipe(): Promise<void> {
    if (!this.db) return;
    await this.db.execAsync(`
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS threads;
      DROP TABLE IF EXISTS outbox_queue;
    `);
    // Re-initialise empty schema immediately
    this.db = null;
    await this.init();
  }

  async getThreads(): Promise<Thread[]> {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getAllAsync<Thread>(
      'SELECT * FROM threads ORDER BY last_timestamp DESC'
    );
  }
}

export const db = new Database();

export const useDb = create<{
  threads: Thread[];
  refreshThreads: () => Promise<void>;
}>((set) => ({
  threads: [],
  refreshThreads: async () => {
    const threads = await db.getThreads();
    set({ threads });
  },
}));
