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

  async init() {
    if (this.db) return;
    this.db = await SQLite.openDatabaseAsync('blinkchat.db');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT,
        from_pubkey TEXT,
        to_pubkey TEXT,
        group_id TEXT,
        plaintext TEXT,
        timestamp INTEGER,
        ttl_seconds INTEGER,
        expires_at INTEGER,
        delivery_status TEXT DEFAULT 'sent'
      );
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        peer_pubkey TEXT,
        nickname TEXT,
        last_message TEXT,
        last_timestamp INTEGER
      );
      CREATE TABLE IF NOT EXISTS outbox_queue (
        id TEXT PRIMARY KEY,
        packet_payload TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at INTEGER,
        expires_at INTEGER
      );
    `);

    // Start self-destruct interval
    setInterval(() => this.deleteExpiredMessages(), 60000);
  }

  async insertMessage(msg: Message) {
    if (!this.db) throw new Error('DB not initialized');
    const _db = this.db!;
    await _db.withTransactionAsync(async () => {
      await _db.runAsync(
        'INSERT INTO messages (id, thread_id, from_pubkey, to_pubkey, group_id, plaintext, timestamp, ttl_seconds, expires_at, delivery_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [msg.id, msg.thread_id, msg.from_pubkey, msg.to_pubkey, msg.group_id, msg.plaintext, msg.timestamp, msg.ttl_seconds, msg.expires_at, msg.delivery_status]
      );

      // Atomic Outbox Queue Entry
      await _db.runAsync(
        'INSERT INTO outbox_queue (id, packet_payload, retry_count, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
        [msg.id, JSON.stringify({ id: msg.id, recipient: msg.to_pubkey, payload: msg.plaintext }), msg.timestamp, 0, msg.expires_at]
      );
    });
  }

  async queuePacket(payload: string, expiresAt: number) {
    if (!this.db) throw new Error('DB not initialized');
    await this.db!.runAsync(
      'INSERT INTO outbox_queue (id, packet_payload, created_at, expires_at) VALUES (?, ?, ?, ?)',
      [Math.random().toString(36).substring(7), payload, Date.now(), expiresAt]
    );
  }

  async popNextQueueItem() {
    if (!this.db) throw new Error('DB not initialized');
    const item = await this.db!.getFirstAsync<{id: string, packet_payload: string}>(
      'SELECT id, packet_payload FROM outbox_queue ORDER BY created_at ASC LIMIT 1'
    );
    return item;
  }

  async acknowledgeQueueItem(id: string) {
    if (!this.db) throw new Error('DB not initialized');
    await this.db!.runAsync('DELETE FROM outbox_queue WHERE id = ?', [id]);
  }


  async getMessagesByThread(threadId: string): Promise<Message[]> {
    if (!this.db) throw new Error('DB not initialized');
    return await this.db!.getAllAsync<Message>(
      'SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC',
      [threadId]
    );
  }

  async updateDeliveryStatus(messageId: string, status: Message['delivery_status']) {
    if (!this.db) throw new Error('DB not initialized');
    await this.db!.runAsync('UPDATE messages SET delivery_status = ? WHERE id = ?', [status, messageId]);
  }

  async deleteExpiredMessages() {
    if (!this.db) return;
    const now = Date.now();
    await this.db.runAsync('DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < ?', [now]);
    await this.db.runAsync('DELETE FROM outbox_queue WHERE expires_at IS NOT NULL AND expires_at < ?', [now]);
    // Expired messages and queue items cleaned up.

  }

  async panicWipe() {
    if (!this.db) return;
    await this.db.execAsync(`
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS threads;
      DROP TABLE IF EXISTS outbox_queue;
    `);
    // PANIC WIPE EXECUTED: All tables dropped.

  }


  async getThreads(): Promise<Thread[]> {
    if (!this.db) throw new Error('DB not initialized');
    return await this.db!.getAllAsync<Thread>('SELECT * FROM threads ORDER BY last_timestamp DESC');
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
