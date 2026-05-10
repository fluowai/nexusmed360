import { createClient, type JID, type MessageInfo, type WhatsmeowClient } from '@whatsmeow-node/whatsmeow-node';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { db } from './db.js';

const DATA_DIR = path.resolve(process.cwd(), 'whatsmeow_data');

class WhatsAppService {
  private clients = new Map<string, WhatsmeowClient>();

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private getStorePath(instanceId: string): string {
    const dir = path.join(DATA_DIR, instanceId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'store.db');
  }

  async initInstance(instanceId: string): Promise<void> {
    if (this.clients.has(instanceId)) return;

    const storePath = this.getStorePath(instanceId);
    let client: WhatsmeowClient;

    try {
      client = createClient({ store: storePath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      db.prepare('UPDATE whatsapp_instances SET status = ? WHERE id = ?').run('disconnected', instanceId);
      return;
    }

    this.clients.set(instanceId, client);
    this.setupEvents(instanceId, client);

    try {
      const result = await client.init();
      if (result.jid) {
        await client.connect();
        db.prepare('UPDATE whatsapp_instances SET status = ?, phone = ?, qrcode = NULL WHERE id = ?')
          .run('connected', result.jid, instanceId);
      } else {
        db.prepare('UPDATE whatsapp_instances SET status = ? WHERE id = ?').run('connecting', instanceId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.clients.delete(instanceId);
      client.close();
      db.prepare('UPDATE whatsapp_instances SET status = ? WHERE id = ?').run('disconnected', instanceId);
    }
  }

  async startQRFlow(instanceId: string): Promise<void> {
    const client = this.clients.get(instanceId);
    if (!client) throw new Error(`Instance ${instanceId} not found`);

    try {
      await client.getQRChannel();
      await client.connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      db.prepare('UPDATE whatsapp_instances SET status = ? WHERE id = ?').run('disconnected', instanceId);
    }
  }

  async reconnectInstance(instanceId: string): Promise<void> {
    const inst = db.prepare('SELECT * FROM whatsapp_instances WHERE id = ?').get(instanceId) as any;
    if (!inst) return;

    await this.initInstance(instanceId);

    if (inst.status === 'waiting_qr' || inst.status === 'connecting') {
      this.startQRFlow(instanceId).catch(() => {});
    }
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    const client = this.clients.get(instanceId);
    if (client) {
      try { await client.disconnect(); } catch {}
      db.prepare('UPDATE whatsapp_instances SET status = ? WHERE id = ?').run('disconnected', instanceId);
    }
  }

  async removeInstance(instanceId: string): Promise<void> {
    const client = this.clients.get(instanceId);
    if (client) {
      try { await client.logout(); } catch {}
      client.close();
      this.clients.delete(instanceId);
    }
    db.prepare('DELETE FROM whatsapp_messages WHERE instance_id = ?').run(instanceId);
    db.prepare('DELETE FROM whatsapp_chats WHERE instance_id = ?').run(instanceId);
    db.prepare('DELETE FROM whatsapp_instances WHERE id = ?').run(instanceId);
  }

  async sendText(instanceId: string, jid: string, text: string): Promise<{ id: string; timestamp: number }> {
    const client = this.clients.get(instanceId);
    if (!client) throw new Error(`Instance ${instanceId} not connected`);
    const connected = await client.isConnected();
    if (!connected) throw new Error(`Instance ${instanceId} is not connected`);
    return client.sendMessage(jid as JID, { conversation: text });
  }

  isInstanceReady(instanceId: string): boolean {
    return this.clients.has(instanceId);
  }

  async shutdown(): Promise<void> {
    for (const [, client] of this.clients) {
      try { await client.disconnect(); } catch {}
      client.close();
    }
    this.clients.clear();
  }

  private setupEvents(instanceId: string, client: WhatsmeowClient): void {
    client.on('qr', async ({ code }) => {
      try {
        const qrImage = await QRCode.toDataURL(code, { width: 300, margin: 2 });
        const qrPayload = JSON.stringify({
          instance: instanceId,
          qrcode: qrImage,
          raw: code,
        });
        db.prepare('UPDATE whatsapp_instances SET qrcode = ?, status = ? WHERE id = ?')
          .run(qrPayload, 'waiting_qr', instanceId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
      }
    });

    client.on('connected', ({ jid }) => {
      db.prepare('UPDATE whatsapp_instances SET status = ?, phone = ?, qrcode = NULL WHERE id = ?')
        .run('connected', jid, instanceId);
    });

    client.on('disconnected', () => {
      db.prepare('UPDATE whatsapp_instances SET status = ? WHERE id = ?').run('disconnected', instanceId);
    });

    client.on('message', ({ info, message }) => {
      try {
        this.handleMessage(instanceId, info, message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[whatsmeow] message handler error for instance ${instanceId}: ${msg}`);
      }
    });

    client.on('logged_out', () => {
      db.prepare('UPDATE whatsapp_instances SET status = ?, qrcode = NULL WHERE id = ?').run('disconnected', instanceId);
    });

    client.on('exit', ({ code }) => {
      this.clients.delete(instanceId);
      db.prepare('UPDATE whatsapp_instances SET status = ? WHERE id = ?').run('disconnected', instanceId);
    });
  }

  private handleMessage(instanceId: string, info: MessageInfo, message: Record<string, unknown>): void {
    const chatJid = info.chat;
    // Skip newsletter/channel messages
    if (chatJid.endsWith('@newsletter')) return;
    const isGroup = info.isGroup;
    const pushName = info.pushName || '';
    const isFromMe = info.isFromMe ? 1 : 0;
    const timestamp = new Date(info.timestamp * 1000).toISOString();

    let content = '';
    let messageType = 'text';
    let mediaUrl = '';
    let mediaName = '';
    let mediaSize = 0;
    let quotedMsgId = '';
    let mentionedJids = '';

    const extText = message.extendedTextMessage as Record<string, unknown> | undefined;
    const contextInfo = extText?.contextInfo as Record<string, unknown> | undefined;

    if (message.conversation) {
      content = message.conversation as string;
    } else if (extText) {
      content = (extText.text as string) || '';
      if (contextInfo) {
        if (contextInfo.quotedMessage) quotedMsgId = (contextInfo.stanzaId as string) || '';
        if (contextInfo.mentionedJid) mentionedJids = JSON.stringify(contextInfo.mentionedJid);
      }
    }

    if (message.imageMessage) {
      messageType = 'image';
      const img = message.imageMessage as Record<string, unknown>;
      content = (img.caption as string) || content;
      mediaUrl = (img.url as string) || '';
      mediaName = `image_${info.id}.jpg`;
      mediaSize = (img.fileLength as number) || 0;
    } else if (message.audioMessage) {
      messageType = 'audio';
      const audio = message.audioMessage as Record<string, unknown>;
      mediaUrl = (audio.url as string) || '';
      mediaName = `audio_${info.id}.ogg`;
      mediaSize = (audio.fileLength as number) || 0;
    } else if (message.videoMessage) {
      messageType = 'video';
      const vid = message.videoMessage as Record<string, unknown>;
      content = (vid.caption as string) || content;
      mediaUrl = (vid.url as string) || '';
      mediaName = `video_${info.id}.mp4`;
      mediaSize = (vid.fileLength as number) || 0;
    } else if (message.documentMessage) {
      messageType = 'document';
      const doc = message.documentMessage as Record<string, unknown>;
      mediaUrl = (doc.url as string) || '';
      mediaName = (doc.fileName as string) || `document_${info.id}`;
      mediaSize = (doc.fileLength as number) || 0;
      content = (doc.caption as string) || content;
    } else if (message.contactMessage) {
      messageType = 'contact';
      content = (message.contactMessage as Record<string, unknown>).displayName as string || 'Contact';
    } else if (message.locationMessage) {
      messageType = 'location';
    }

    const phone = chatJid.split('@')[0];
    const isGroupNum = isGroup ? 1 : 0;
    const groupName = isGroup ? pushName : null;
    const contactName = !isGroup ? pushName : null;

    const displayContent = messageType === 'text' ? content
      : messageType === 'image' ? '🖼️ Imagem'
      : messageType === 'audio' ? '🎵 Áudio'
      : messageType === 'video' ? '🎬 Vídeo'
      : messageType === 'document' ? `📄 ${mediaName}`
      : messageType === 'contact' ? '👤 Contato'
      : '📎 Mídia';

    if (isFromMe) {
      const upsert = db.prepare(`
        INSERT INTO whatsapp_chats (jid, instance_id, name, pushname, phone, is_group, unread, last_message, last_message_time, last_message_type)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        ON CONFLICT(jid, instance_id) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, name),
          pushname = COALESCE(EXCLUDED.pushname, pushname),
          last_message = EXCLUDED.last_message,
          last_message_time = EXCLUDED.last_message_time,
          last_message_type = EXCLUDED.last_message_type
      `);
      upsert.run(chatJid, instanceId, groupName, contactName, phone, isGroupNum, displayContent, timestamp, messageType);
    } else {
      const upsert = db.prepare(`
        INSERT INTO whatsapp_chats (jid, instance_id, name, pushname, phone, is_group, unread, last_message, last_message_time, last_message_type)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(jid, instance_id) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, name),
          pushname = COALESCE(EXCLUDED.pushname, pushname),
          unread = unread + 1,
          last_message = EXCLUDED.last_message,
          last_message_time = EXCLUDED.last_message_time,
          last_message_type = EXCLUDED.last_message_type
      `);
      upsert.run(chatJid, instanceId, groupName, contactName, phone, isGroupNum, displayContent, timestamp, messageType);
    }

    const insertMsg = db.prepare(`
      INSERT OR IGNORE INTO whatsapp_messages
        (id, instance_id, chat_jid, from_me, content, message_type, media_url, media_name, media_size, quoted_msg_id, mentioned_jids, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertMsg.run(
      info.id, instanceId, chatJid, isFromMe, content, messageType,
      mediaUrl || null, mediaName || null, mediaSize || null,
      quotedMsgId || null, mentionedJids || null, timestamp
    );
  }
}

const service = new WhatsAppService();
export default service;
