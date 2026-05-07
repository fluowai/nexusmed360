import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { initDb, db } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  initDb();

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

  // Example: Create/Update Medical Record
  app.post('/api/medical-records', (req, res) => {
    const { id, tenant_id, patient_id, professional_id, entry_type, content, locked } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO medical_records (id, tenant_id, patient_id, professional_id, entry_type, content, locked)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          locked = excluded.locked,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(id || crypto.randomUUID(), tenant_id, patient_id, professional_id, entry_type, content, locked ? 1 : 0);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save medical record' });
    }
  });

  // Mock data population for demo
  app.post('/api/mock/populate', (req, res) => {
    try {
      const tenantId = 'demo-clinic-1';
      const userId = 'user-1';
      const patientId = 'pat-1';
      
      // Create Tenant
      db.prepare('INSERT OR IGNORE INTO tenants (id, name, plan) VALUES (?, ?, ?)').run(tenantId, 'Nexus Prime Clinic', 'premium');
      
      // Create Unit
      db.prepare('INSERT OR IGNORE INTO units (id, tenant_id, name, address) VALUES (?, ?, ?, ?)').run('unit-1', tenantId, 'Unidade Centro', 'Rua das Flores, 123');

      // Create Admin/Professional
      db.prepare('INSERT OR IGNORE INTO users (id, tenant_id, name, email, role) VALUES (?, ?, ?, ?, ?)').run(userId, tenantId, 'Dr. Ricardo Nexus', 'ricardo@nexus.com', 'owner');

      // Create some Patient and Leads
      db.prepare('INSERT OR IGNORE INTO patients (id, tenant_id, full_name, phone, email, source) VALUES (?, ?, ?, ?, ?, ?)').run(
        patientId, tenantId, 'João da Silva', '5548988001122', 'joao@email.com', 'Instagram'
      );

      db.prepare('INSERT OR IGNORE INTO leads (id, tenant_id, name, phone, status) VALUES (?, ?, ?, ?, ?)').run(
        'lead-1', tenantId, 'Maria Oliveira', '5548977665544', 'new'
      );

      // Create a Transaction
      db.prepare('INSERT OR IGNORE INTO financial_transactions (id, tenant_id, patient_id, amount, type, status, category) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'trans-1', tenantId, patientId, 1500.00, 'income', 'paid', 'Harmonização'
      );

      // Create Medical Records
      db.prepare(`
        INSERT OR IGNORE INTO medical_records (id, tenant_id, patient_id, professional_id, entry_type, content) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'mr-1', tenantId, patientId, userId, 'evolution', 
        'Paciente apresenta melhora significativa na cicatrização após procedimento de preenchimento. Sem sinais de inflamação. Recomendado manter hidratação local.'
      );

      db.prepare(`
        INSERT OR IGNORE INTO medical_records (id, tenant_id, patient_id, professional_id, entry_type, content) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'mr-2', tenantId, patientId, userId, 'evaluation', 
        'Avaliação inicial: Desejo de melhora no sulco nasogeniano. Pele classificada como Fitzpatrick III. Proposto protocolo de 3 sessões de Bioestimulador.'
      );

      res.json({ message: 'Mock data created' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to populate' });
    }
  });

  // Example: Get Dashboard Stats (Mock Global for demo)
  app.get('/api/dashboard/stats', (req, res) => {
    // In a real app, we'd filter by tenant_id
    try {
      const stats = {
        leads: db.prepare('SELECT count(*) as count FROM leads').get() as { count: number },
        appointments: db.prepare('SELECT count(*) as count FROM appointments WHERE status = ?').get('scheduled') as { count: number },
        patients: db.prepare('SELECT count(*) as count FROM patients').get() as { count: number },
        revenue: db.prepare('SELECT sum(amount) as total FROM financial_transactions WHERE status = ?').get('paid') as { total: number },
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Example: Get Patients
  app.get('/api/patients', (req, res) => {
    const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
    res.json(patients);
  });

  // Example: Create Patient
  app.post('/api/patients', (req, res) => {
    const { id, tenant_id, full_name, phone, email, source } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO patients (id, tenant_id, full_name, phone, email, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id || crypto.randomUUID(), tenant_id || 'demo-clinic-1', full_name, phone, email, source);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create patient' });
    }
  });

  // Example: Get Leads
  app.get('/api/leads', (req, res) => {
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    res.json(leads);
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus Saúde 360 running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
