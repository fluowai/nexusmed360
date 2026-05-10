import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { initDb, db } from './src/server/db.ts';
import whatsappService from './src/server/whatsmeow.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  initDb();

  // Reconnect existing WhatsApp instances
  const waInstances = db.prepare("SELECT id FROM whatsapp_instances WHERE status != 'disconnected'").all() as any[];
  for (const inst of waInstances) {
    whatsappService.reconnectInstance(inst.id).catch(() => {});
  }

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Example: Get Medical Records for a specific patient
  app.get('/api/patients/:id/records', (req, res) => {
    try {
      const records = db.prepare(`
        SELECT mr.*, u.name as professional_name 
        FROM medical_records mr
        LEFT JOIN users u ON mr.professional_id = u.id
        WHERE mr.patient_id = ?
        ORDER BY mr.created_at DESC
      `).all(req.params.id);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch medical records' });
    }
  });

  // --- Medical Records ---

  // Create/Update Medical Record
  app.post('/api/medical-records', (req, res) => {
    const { id, tenant_id, patient_id, professional_id, entry_type, content, locked, signed_at } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO medical_records (id, tenant_id, patient_id, professional_id, entry_type, content, locked, signed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          locked = excluded.locked,
          signed_at = COALESCE(excluded.signed_at, signed_at),
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(id || crypto.randomUUID(), tenant_id, patient_id, professional_id, entry_type, content, locked ? 1 : 0, signed_at || null);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save medical record' });
    }
  });

  // --- Appointments CRUD ---

  app.get('/api/appointments', (req, res) => {
    try {
      const { date, professional_id } = req.query;
      let sql = `
        SELECT a.*, p.full_name as patient_name, u.name as professional_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.professional_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (date) {
        sql += ` AND date(a.start_time) = ?`;
        params.push(date);
      }
      if (professional_id) {
        sql += ` AND a.professional_id = ?`;
        params.push(professional_id);
      }

      sql += ` ORDER BY a.start_time ASC`;
      const appointments = db.prepare(sql).all(...params);
      res.json(appointments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  app.post('/api/appointments', (req, res) => {
    const { id, tenant_id, patient_id, professional_id, unit_id, start_time, end_time, status, notes, full_name, phone, email } = req.body;
    try {
      const appointmentId = id || crypto.randomUUID();
      const appTenantId = tenant_id || 'demo-clinic-1';
      const appProfessionalId = professional_id || 'user-1';
      const appUnitId = unit_id || 'unit-1';

      let appPatientId = patient_id;

      if (!appPatientId && full_name) {
        const existingPatient = db.prepare('SELECT id FROM patients WHERE phone = ? LIMIT 1').get(phone) as any;
        if (existingPatient) {
          appPatientId = existingPatient.id;
        } else {
          appPatientId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO patients (id, tenant_id, full_name, phone, email, source)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(appPatientId, appTenantId, full_name, phone, email || null, 'Agendamento');
        }
      }

      const stmt = db.prepare(`
        INSERT INTO appointments (id, tenant_id, patient_id, professional_id, unit_id, start_time, end_time, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes,
          start_time = excluded.start_time,
          end_time = excluded.end_time
      `);
      stmt.run(appointmentId, appTenantId, appPatientId, appProfessionalId, appUnitId, start_time, end_time, status || 'scheduled', notes || null);
      res.json({ success: true, id: appointmentId, patient_id: appPatientId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create appointment' });
    }
  });

  app.put('/api/appointments/:id', (req, res) => {
    try {
      const { status, start_time, end_time, notes } = req.body;
      db.prepare(`
        UPDATE appointments SET status = COALESCE(?, status), start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time), notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(status || null, start_time || null, end_time || null, notes || null, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update appointment' });
    }
  });

  app.delete('/api/appointments/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete appointment' });
    }
  });

  // --- Leads CRUD ---

  app.post('/api/leads', (req, res) => {
    const { id, tenant_id, name, phone, email, source, status, notes } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO leads (id, tenant_id, name, phone, email, source, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id || crypto.randomUUID(), tenant_id || 'demo-clinic-1', name, phone, email || null, source || 'Manual', status || 'new', notes || null);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });

  app.put('/api/leads/:id', (req, res) => {
    try {
      const { name, phone, email, source, status, assigned_to, notes } = req.body;
      db.prepare(`
        UPDATE leads SET name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email),
        source = COALESCE(?, source), status = COALESCE(?, status), assigned_to = COALESCE(?, assigned_to),
        notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name || null, phone || null, email || null, source || null, status || null, assigned_to || null, notes || null, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  app.delete('/api/leads/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  });

  // --- Patients: Update & Delete ---

  app.put('/api/patients/:id', (req, res) => {
    const { full_name, social_name, document_number, birth_date, gender, phone, email, address, source, notes } = req.body;
    try {
      db.prepare(`
        UPDATE patients SET
          full_name = COALESCE(?, full_name), social_name = COALESCE(?, social_name),
          document_number = COALESCE(?, document_number), birth_date = COALESCE(?, birth_date),
          gender = COALESCE(?, gender), phone = COALESCE(?, phone), email = COALESCE(?, email),
          address = COALESCE(?, address), source = COALESCE(?, source), notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(full_name || null, social_name || null, document_number || null, birth_date || null,
        gender || null, phone || null, email || null, address || null, source || null, notes || null, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update patient' });
    }
  });

  app.delete('/api/patients/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete patient' });
    }
  });

  // --- Users ---

  app.get('/api/users', (req, res) => {
    try {
      const users = db.prepare('SELECT id, tenant_id, name, email, role, status FROM users ORDER BY name ASC').all();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // --- Dashboard Stats ---

  app.get('/api/dashboard/stats', (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = {
        leads: db.prepare('SELECT count(*) as count FROM leads').get() as { count: number },
        appointments: db.prepare('SELECT count(*) as count FROM appointments WHERE date(start_time) = ? AND status = ?').get(today, 'scheduled') as { count: number },
        patients: db.prepare('SELECT count(*) as count FROM patients').get() as { count: number },
        revenue: db.prepare('SELECT coalesce(sum(amount), 0) as total FROM financial_transactions WHERE status = ?').get('paid') as { total: number },
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // --- Patients ---

  app.get('/api/patients', (req, res) => {
    const { search } = req.query;
    try {
      let sql = 'SELECT * FROM patients';
      const params: any[] = [];
      if (search) {
        sql += ` WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ?`;
        const q = `%${search}%`;
        params.push(q, q, q);
      }
      sql += ' ORDER BY created_at DESC';
      const patients = db.prepare(sql).all(...params);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch patients' });
    }
  });

  // Create Patient
  app.post('/api/patients', (req, res) => {
    const { id, tenant_id, full_name, social_name, document_number, birth_date, gender, phone, email, address, source, notes } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO patients (id, tenant_id, full_name, social_name, document_number, birth_date, gender, phone, email, address, source, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id || crypto.randomUUID(), tenant_id || 'demo-clinic-1', full_name, social_name || null,
        document_number || null, birth_date || null, gender || null, phone, email || null,
        address || null, source || 'Manual', notes || null);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create patient' });
    }
  });

  // --- Leads ---

  app.get('/api/leads', (req, res) => {
    const { search, status } = req.query;
    try {
      let sql = 'SELECT * FROM leads';
      const params: any[] = [];
      const conditions: string[] = [];
      if (search) {
        conditions.push(`(name LIKE ? OR phone LIKE ? OR email LIKE ?)`);
        const q = `%${search}%`;
        params.push(q, q, q);
      }
      if (status) {
        conditions.push(`status = ?`);
        params.push(status);
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY created_at DESC';
      const leads = db.prepare(sql).all(...params);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  // --- Mock Data ---

  app.post('/api/mock/populate', (req, res) => {
    try {
      const tenantId = 'demo-clinic-1';
      const userId = 'user-1';
      const patientId = 'pat-1';
      const unitId = 'unit-1';
      
      db.prepare('INSERT OR IGNORE INTO tenants (id, name, plan) VALUES (?, ?, ?)').run(tenantId, 'Nexus Prime Clinic', 'premium');
      db.prepare('INSERT OR IGNORE INTO units (id, tenant_id, name, address) VALUES (?, ?, ?, ?)').run(unitId, tenantId, 'Unidade Centro', 'Rua das Flores, 123');
      db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, name, email, role) VALUES (?, ?, ?, ?, ?)').run(userId, tenantId, 'Dr. Ricardo Nexus', 'ricardo@nexus.com', 'owner');
      db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, name, email, role) VALUES (?, ?, ?, ?, ?)').run('user-2', tenantId, 'Dra. Ana Beatriz', 'ana@nexus.com', 'professional');

      db.prepare('INSERT OR IGNORE INTO patients (id, tenant_id, full_name, phone, email, source) VALUES (?, ?, ?, ?, ?, ?)').run(
        patientId, tenantId, 'João da Silva', '5548988001122', 'joao@email.com', 'Instagram'
      );
      db.prepare('INSERT OR IGNORE INTO patients (id, tenant_id, full_name, phone, email, source) VALUES (?, ?, ?, ?, ?, ?)').run(
        'pat-2', tenantId, 'Maria Santos', '5548911223344', 'maria@email.com', 'Google'
      );

      db.prepare('INSERT OR IGNORE INTO leads (id, tenant_id, name, phone, email, source, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'lead-1', tenantId, 'Maria Oliveira', '5548977665544', 'maria.o@email.com', 'Instagram', 'new'
      );
      db.prepare('INSERT OR IGNORE INTO leads (id, tenant_id, name, phone, email, source, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'lead-2', tenantId, 'Carlos Pereira', '5548933221100', 'carlos@email.com', 'Google Ads', 'qualification'
      );

      db.prepare('INSERT OR IGNORE INTO financial_transactions (id, tenant_id, patient_id, amount, type, status, category) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'trans-1', tenantId, patientId, 1500.00, 'income', 'paid', 'Harmonização'
      );

      db.prepare('INSERT OR IGNORE INTO medical_records (id, tenant_id, patient_id, professional_id, entry_type, content) VALUES (?, ?, ?, ?, ?, ?)').run(
        'mr-1', tenantId, patientId, userId, 'evolution', 
        'Paciente apresenta melhora significativa na cicatrização após procedimento de preenchimento. Sem sinais de inflamação. Recomendado manter hidratação local.'
      );
      db.prepare('INSERT OR IGNORE INTO medical_records (id, tenant_id, patient_id, professional_id, entry_type, content) VALUES (?, ?, ?, ?, ?, ?)').run(
        'mr-2', tenantId, patientId, userId, 'evaluation', 
        'Avaliação inicial: Desejo de melhora no sulco nasogeniano. Pele classificada como Fitzpatrick III. Proposto protocolo de 3 sessões de Bioestimulador.'
      );

      // Appointments for today
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      db.prepare('INSERT OR IGNORE INTO appointments (id, tenant_id, patient_id, professional_id, unit_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        'apt-1', tenantId, patientId, userId, unitId, `${todayStr}T09:00:00`, `${todayStr}T09:30:00`, 'scheduled'
      );
      db.prepare('INSERT OR IGNORE INTO appointments (id, tenant_id, patient_id, professional_id, unit_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        'apt-2', tenantId, 'pat-2', userId, unitId, `${todayStr}T10:00:00`, `${todayStr}T10:45:00`, 'scheduled'
      );

      res.json({ message: 'Mock data created with appointments, leads, and patients' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to populate' });
    }
  });

  // ===================== WHATSAPP API =====================

  const WA_PREFIX = '/api/whatsapp';

  // --- Phone number helpers ---
  const formatPhone = (raw: string) => {
    if (!raw) return '';
    let n = raw.replace(/\D/g, '');
    if (n.startsWith('55') && n.length >= 12) {
      const ddi = n.slice(0, 2);
      const ddd = n.slice(2, 4);
      const rest = n.slice(4);
      if (rest.length === 9) return `+${ddi} (${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`;
      return `+${ddi} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
    if (n.length >= 10) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 9)}-${n.slice(9)}`;
    return `+${n}`;
  };

  const getDisplayName = (chat: any) => {
    if (chat.is_group && chat.name) return chat.name;
    if (chat.pushname) return chat.pushname;
    if (chat.name) return chat.name;
    return formatPhone(chat.phone || chat.jid?.split('@')[0] || '');
  };

  // --- Instances ---

  app.get(`${WA_PREFIX}/instances`, (req, res) => {
    try {
      const instances = db.prepare('SELECT * FROM whatsapp_instances ORDER BY created_at DESC').all();
      res.json(instances);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch instances' }); }
  });

  app.get(`${WA_PREFIX}/instances/:id`, (req, res) => {
    try {
      const instance = db.prepare('SELECT * FROM whatsapp_instances WHERE id = ?').get(req.params.id);
      if (!instance) return res.status(404).json({ error: 'Instance not found' });
      res.json(instance);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch instance' }); }
  });

  app.post(`${WA_PREFIX}/instances`, async (req, res) => {
    try {
      const { id, name, tenant_id } = req.body;
      const instanceId = id || crypto.randomUUID();
      const tenantId = tenant_id || 'demo-clinic-1';

      db.prepare('INSERT INTO whatsapp_instances (id, tenant_id, name, status) VALUES (?, ?, ?, ?)')
        .run(instanceId, tenantId, name || 'WhatsApp', 'disconnected');

      whatsappService.initInstance(instanceId).then(() => {
        whatsappService.startQRFlow(instanceId).catch(() => {});
      }).catch(() => {});

      const startTime = Date.now();
      while (Date.now() - startTime < 12000) {
        const row = db.prepare('SELECT * FROM whatsapp_instances WHERE id = ?').get(instanceId) as any;
        if (row && (row.status === 'waiting_qr' || row.status === 'connected')) {
          return res.json(row);
        }
        await new Promise(r => setTimeout(r, 500));
      }

      const row = db.prepare('SELECT * FROM whatsapp_instances WHERE id = ?').get(instanceId);
      res.json(row);
    } catch (e) { res.status(500).json({ error: 'Failed to create instance' }); }
  });

  app.delete(`${WA_PREFIX}/instances/:id`, async (req, res) => {
    try {
      await whatsappService.removeInstance(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to delete instance' }); }
  });

  app.put(`${WA_PREFIX}/instances/:id/status`, (req, res) => {
    try {
      const { status, phone } = req.body;
      const updates: string[] = [];
      const params: any[] = [];
      if (status) { updates.push('status = ?'); params.push(status); }
      if (phone) { updates.push('phone = ?'); params.push(phone); }
      if (updates.length > 0) {
        params.push(req.params.id);
        db.prepare(`UPDATE whatsapp_instances SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update status' }); }
  });

  // --- Chats ---

  app.get(`${WA_PREFIX}/instances/:id/chats`, (req, res) => {
    try {
      const chats = db.prepare(`
        SELECT * FROM whatsapp_chats
        WHERE instance_id = ? AND archived = 0 AND jid NOT LIKE '%@newsletter'
        ORDER BY is_group DESC, last_message_time DESC
      `).all(req.params.id);
      res.json(chats.map((c: any) => ({ ...c, displayName: getDisplayName(c) })));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch chats' }); }
  });

  app.put(`${WA_PREFIX}/instances/:id/chats/:jid`, (req, res) => {
    try {
      const { name, pushname, profile_pic, archived } = req.body;
      const sets: string[] = [];
      const params: any[] = [];
      if (name !== undefined) { sets.push('name = ?'); params.push(name); }
      if (pushname !== undefined) { sets.push('pushname = ?'); params.push(pushname); }
      if (profile_pic !== undefined) { sets.push('profile_pic = ?'); params.push(profile_pic); }
      if (archived !== undefined) { sets.push('archived = ?'); params.push(archived); }
      if (sets.length > 0) {
        params.push(req.params.jid, req.params.id);
        db.prepare(`UPDATE whatsapp_chats SET ${sets.join(',')} WHERE jid = ? AND instance_id = ?`).run(...params);
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to update chat' }); }
  });

  // --- Messages ---

  app.get(`${WA_PREFIX}/instances/:id/chats/:jid/messages`, (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const messages = db.prepare(`
        SELECT * FROM whatsapp_messages
        WHERE instance_id = ? AND chat_jid = ?
        ORDER BY timestamp ASC
      `).all(req.params.id, req.params.jid).slice(-limit);
      res.json(messages.map((m: any) => ({ ...m, from_me: Boolean(m.from_me) })));
    } catch (e) { res.status(500).json({ error: 'Failed to fetch messages' }); }
  });

  app.post(`${WA_PREFIX}/instances/:id/send`, async (req, res) => {
    try {
      const { chat_jid, content, message_type } = req.body;
      const timestamp = new Date().toISOString();
      let msgId = 'wa_' + crypto.randomUUID().replace(/-/g, '');

      const typeLabel = message_type === 'image' ? '🖼️ Imagem'
        : message_type === 'audio' ? '🎵 Áudio'
        : message_type === 'document' ? '📄 Documento'
        : message_type === 'video' ? '🎬 Vídeo'
        : content;

      if (message_type === 'text' || !message_type) {
        try {
          const result = await whatsappService.sendText(req.params.id, chat_jid, content);
          msgId = result.id;
        } catch (sendErr) {
          // Store locally as fallback
        }
      }

      db.prepare('INSERT OR IGNORE INTO whatsapp_messages (id, instance_id, chat_jid, from_me, content, message_type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        msgId, req.params.id, chat_jid, 1, content, message_type || 'text', timestamp
      );
      db.prepare('UPDATE whatsapp_chats SET last_message = ?, last_message_time = ?, last_message_type = ? WHERE jid = ? AND instance_id = ?').run(
        typeLabel, timestamp, message_type || 'text', chat_jid, req.params.id
      );
      res.json({ success: true, id: msgId });
    } catch (e) { res.status(500).json({ error: 'Failed to send message' }); }
  });

  app.post(`${WA_PREFIX}/instances/:id/send-media`, (req, res) => {
    try {
      const { chat_jid, content, message_type, media_name, media_size, duration } = req.body;
      const msgId = 'wa_' + crypto.randomUUID().replace(/-/g, '');
      const timestamp = new Date().toISOString();
      db.prepare('INSERT INTO whatsapp_messages (id, instance_id, chat_jid, from_me, content, message_type, media_name, media_size, duration, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        msgId, req.params.id, chat_jid, 1, content, message_type, media_name, media_size, duration, timestamp
      );
      const typeLabel = message_type === 'image' ? '🖼️ Imagem' : message_type === 'audio' ? '🎵 Áudio' : message_type === 'document' ? `📄 ${media_name || 'Documento'}` : message_type === 'video' ? '🎬 Vídeo' : '📎 Mídia';
      db.prepare('UPDATE whatsapp_chats SET last_message = ?, last_message_time = ?, last_message_type = ? WHERE jid = ? AND instance_id = ?').run(
        typeLabel, timestamp, message_type, chat_jid, req.params.id
      );
      res.json({ success: true, id: msgId });
    } catch (e) { res.status(500).json({ error: 'Failed to send media' }); }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus Saúde 360 running at http://localhost:${PORT}`);
  });

  const cleanup = async () => {
    await whatsappService.shutdown();
    server.close();
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startServer().catch(console.error);
