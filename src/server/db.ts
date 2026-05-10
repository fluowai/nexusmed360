import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './nexus_health.db';

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  console.log('Initializing database...');

  // Tenants (Clínicas)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      legal_name TEXT,
      document_number TEXT,
      email TEXT,
      phone TEXT,
      plan TEXT DEFAULT 'free',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Units (Unidades)
  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    )
  `);

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    )
  `);

  // Patients
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      social_name TEXT,
      document_number TEXT,
      birth_date TEXT,
      gender TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      source TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    )
  `);

  // Leads & Pipeline
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      patient_id TEXT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      source TEXT,
      status TEXT NOT NULL,
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // Appointments
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      professional_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (professional_id) REFERENCES users(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    )
  `);

  // Medical Records (Prontuários)
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      professional_id TEXT NOT NULL,
      entry_type TEXT NOT NULL, -- evaluation, evolution, etc.
      content TEXT NOT NULL, -- JSON or text
      signed_at DATETIME,
      locked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (professional_id) REFERENCES users(id)
    )
  `);

  // Financial
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      patient_id TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- income, expense
      category TEXT,
      status TEXT NOT NULL, -- pending, paid, cancelled
      due_date TEXT,
      paid_at TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // --- WhatsApp ---

  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_instances (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'disconnected',
      qrcode TEXT,
      pairing_code TEXT,
      webhook_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_chats (
      jid TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      name TEXT,
      pushname TEXT,
      phone TEXT,
      is_group INTEGER DEFAULT 0,
      profile_pic TEXT,
      unread INTEGER DEFAULT 0,
      last_message TEXT,
      last_message_time DATETIME,
      last_message_type TEXT,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (jid, instance_id),
      FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      chat_jid TEXT NOT NULL,
      from_me INTEGER DEFAULT 0,
      content TEXT,
      message_type TEXT DEFAULT 'text',
      media_url TEXT,
      media_name TEXT,
      media_size INTEGER,
      duration INTEGER,
      is_forwarded INTEGER DEFAULT 0,
      quoted_msg_id TEXT,
      mentioned_jids TEXT,
      ack INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id),
      FOREIGN KEY (chat_jid, instance_id) REFERENCES whatsapp_chats(jid, instance_id)
    )
  `);

  // Migrations for existing tables
  try { db.exec('ALTER TABLE medical_records ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}
  try { db.exec('ALTER TABLE appointments ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}
  try { db.exec('ALTER TABLE financial_transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}

  console.log('Database initialized successfully.');
}
