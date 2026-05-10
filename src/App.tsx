import {
  Users, Calendar, TrendingUp, DollarSign, MessageSquare, Plus, LayoutDashboard, FileText, Settings,
  Bell, SearchIcon, UserCircle, BrainCircuit, Sparkles, ShieldCheck, BarChart3, Stethoscope, Heart,
  Activity, Moon, Zap, Clock, ChevronRight, ChevronLeft, Trash2, Pencil, X, Check, Loader2,
  Smartphone, Wifi, WifiOff, QrCode, SendHorizontal, Paperclip, ImageIcon, Mic,
  FileArchive, Download, CheckCheck, Circle, MoreHorizontal, Phone, CircleDot,
  Archive, Plug, ScanLine, Volume2, Video, ImageOff, Users as UsersGroup, Globe,
  Info, Mail, MapPin, Tag, Save, UserPlus, ExternalLink, AtSign, Reply
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback, useRef, type ReactNode, type KeyboardEvent } from 'react';

// ======================== TYPES ========================

interface AIAgent {
  id: string; name: string; role: string; type: 'vendas_especialidade' | 'suporte_conversao' | 'rotina_clinica';
  category: string; description: string; training: string; icon: any; status: 'active' | 'idle' | 'learning';
}
interface Stats { leads: { count: number }; appointments: { count: number }; patients: { count: number }; revenue: { total: number }; }
interface Patient {
  id: string; tenant_id: string; full_name: string; social_name?: string; document_number?: string;
  birth_date?: string; gender?: string; phone?: string; email?: string; address?: string;
  source?: string; notes?: string; created_at: string; updated_at: string;
}
interface MedicalRecord {
  id: string; patient_id: string; professional_id: string; professional_name: string;
  entry_type: string; content: string; signed_at?: string; locked: number; created_at: string;
}
interface Appointment {
  id: string; patient_id: string; professional_id: string; professional_name: string;
  patient_name: string; unit_id: string; start_time: string; end_time: string; status: string; notes?: string;
}
interface Lead { id: string; tenant_id: string; name: string; phone?: string; email?: string; source?: string; status: string; assigned_to?: string; created_at: string; }
interface WAInstance { id: string; tenant_id: string; name: string; phone: string; status: string; qrcode: string; pairing_code: string; created_at: string; }
interface WAChat {
  jid: string; instance_id: string; name: string; pushname: string | null; phone: string;
  is_group: number; profile_pic: string; unread: number; last_message: string;
  last_message_time: string; last_message_type: string; displayName?: string;
}
interface WAMessage {
  id: string; instance_id: string; chat_jid: string; from_me: boolean;
  content: string; message_type: string; media_url?: string; media_name?: string;
  media_size?: number; duration?: number; is_forwarded?: number; quoted_msg_id?: string;
  mentioned_jids?: string; timestamp: string;
}

// ======================== UTILITIES ========================

const fmtPhone = (raw: string): string => {
  if (!raw) return '';
  let n = raw.replace(/\D/g, '');
  if (n.startsWith('55') && n.length >= 12) {
    const ddd = n.slice(2, 4);
    const rest = n.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`;
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (n.length >= 12) return `+${n.slice(0, 2)} (${n.slice(2, 4)}) ${n.slice(4, 9)}-${n.slice(9)}`;
  return raw;
};

const displayName = (chat: WAChat): string => {
  if (chat.is_group && chat.name) return chat.name;
  if (chat.pushname) return chat.pushname;
  if (chat.name) return chat.name;
  return fmtPhone(chat.phone || chat.jid?.split('@')[0] || '');
};

const waTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const messageIcon = (type: string, content?: string) => {
  if (type === 'image') return '🖼️';
  if (type === 'audio') return '🎵';
  if (type === 'video') return '🎬';
  if (type === 'document') return '📄';
  if (type === 'sticker') return '🏷️';
  if (content?.startsWith('http')) return '🔗';
  return null;
};

const messagePreview = (msg: WAMessage): string => {
  const icon = messageIcon(msg.message_type, msg.content);
  if (icon) return `${icon} ${msg.message_type === 'document' ? msg.media_name || 'Documento' : msg.content || ''}`;
  return msg.content || '';
};

const validateEmail = (email: string) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (p: string): string | null => {
  if (!p) return 'Telefone é obrigatório';
  const c = p.replace(/[\s\-()]/g, '');
  if (!/^\+?\d+$/.test(c)) return 'Deve conter apenas números';
  if (c.length < 10) return 'Muito curto (mín 10 dígitos)';
  if (c.length > 15) return 'Muito longo (máx 15 dígitos)';
  return null;
};

// ======================== AGENTS DATA ========================
const AGENTS: AIAgent[] = [
  { id: 've1', name: 'Consultor de Implantes Dentários', role: 'Vendas Odontologia', type: 'vendas_especialidade', category: 'especialidade', description: 'Especialista em fechamento de protocolos de implantes e reabilitação oral.', training: 'Domínio técnico sobre titânio, carga imediata e estética.', icon: TrendingUp, status: 'active' },
  { id: 've2', name: 'Especialista em Invisalign', role: 'Vendas Ortodontia Premium', type: 'vendas_especialidade', category: 'especialidade', description: 'Focado na conversão de pacientes para alinhadores invisíveis.', training: 'Persona tecnológica. Compara benefícios de alinhadores vs aparelhos fixos.', icon: Sparkles, status: 'active' },
  { id: 've3', name: 'Consultor de Harmonização Facial', role: 'Vendas Estética Avançada', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende planos de rejuvenescimento facial, botox e bioestimuladores.', training: 'Argumentação sobre beleza natural e proporção áurea.', icon: UserCircle, status: 'active' },
  { id: 've4', name: 'Avaliador de Transplante Capilar', role: 'Vendas Dermatologia Capilar', type: 'vendas_especialidade', category: 'especialidade', description: 'Qualifica leads interessados em restauração capilar técnica FUE.', training: 'Abordagem empática sobre calvície.', icon: SearchIcon, status: 'active' },
  { id: 've5', name: 'Consultor de Lipoaspiração HD', role: 'Vendas Cirurgia Plástica', type: 'vendas_especialidade', category: 'especialidade', description: 'Conversão de leads para cirurgias de contorno corporal de alta definição.', training: 'Explica tecnologias como Vaser/Renuvion.', icon: ShieldCheck, status: 'active' },
  { id: 've6', name: 'Consultor de Prótese de Mama', role: 'Vendas Cirurgia Plástica', type: 'vendas_especialidade', category: 'especialidade', description: 'Especialista em fechamento de mamoplastia e mastopexia.', training: 'Persona acolhedora. Explica tipos de perfis e marcas.', icon: Heart, status: 'active' },
  { id: 've7', name: 'Especialista em Cirurgia Refrativa', role: 'Vendas Oftalmologia', type: 'vendas_especialidade', category: 'especialidade', description: 'Converte pacientes que buscam independência total de óculos via laser.', training: 'Vende liberdade visual e praticidade.', icon: Stethoscope, status: 'active' },
  { id: 've8', name: 'Mentor de Emagrecimento Clínico', role: 'Vendas Nutrologia/Endocrino', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende protocolos de perda de peso com canetas emagrecedoras.', training: 'Foco em saúde metabólica e longevidade.', icon: BarChart3, status: 'active' },
  { id: 've9', name: 'Consultor de Varizes a Laser', role: 'Vendas Cirurgia Vascular', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende tratamentos de varizes com técnicas minimamente invasivas.', training: 'Foco em estética das pernas e saúde circulatória.', icon: Activity, status: 'active' },
  { id: 've10', name: 'Especialista em Ginecologia Regenerativa', role: 'Vendas Saúde Íntima', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende rejuvenescimento íntimo e laser vaginal.', training: 'Abordagem ética e discreta.', icon: Sparkles, status: 'active' },
  { id: 've11', name: 'Consultor de Check-up Executivo', role: 'Vendas Medicina Preventiva', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende planos de saúde corporativos premium e check-ups.', training: 'Foco em tempo e performance.', icon: ShieldCheck, status: 'active' },
  { id: 've12', name: 'Especialista em Soroterapias', role: 'Vendas Performance/Nutrição', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende protocolos de reposição de vitaminas e detox.', training: 'Persona enérgica. Foco em disposição e imunidade.', icon: Zap, status: 'active' },
  { id: 've13', name: 'Consultor de Reabilitação Esportiva', role: 'Vendas Fisio/Ortopedia', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende pacotes de recuperação para atletas.', training: 'Foco no retorno ao esporte.', icon: Activity, status: 'active' },
  { id: 've14', name: 'Especialista em Alergia e Imunoterapia', role: 'Vendas Alergologia', type: 'vendas_especialidade', category: 'especialidade', description: 'Converte pacientes para protocolos de vacinas.', training: 'Vende qualidade de vida familiar.', icon: ShieldCheck, status: 'active' },
  { id: 've15', name: 'Consultor de Longevidade (Modulação)', role: 'Vendas Medicina do Estilo de Vida', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende protocolos de otimização hormonal.', training: 'Foco em biomarcadores de juventude.', icon: BrainCircuit, status: 'active' },
  { id: 've16', name: 'Avaliador de Rinoplastia', role: 'Vendas Cirurgia da Face', type: 'vendas_especialidade', category: 'especialidade', description: 'Qualifica leads que buscam correção estética do nariz.', training: 'Persona perfeccionista. Explica simulações 3D.', icon: SearchIcon, status: 'active' },
  { id: 've17', name: 'Consultor de Medicina do Sono', role: 'Vendas Sono/CPAP', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende tratamentos para ronco, apneia e insônia.', training: 'Vende energia matinal.', icon: Moon, status: 'active' },
  { id: 've18', name: 'Especialista em Psicoterapia Premium', role: 'Vendas Saúde Mental', type: 'vendas_especialidade', category: 'especialidade', description: 'Converte pacotes de terapia para executivos.', training: 'Empatia extrema.', icon: BrainCircuit, status: 'active' },
  { id: 've19', name: 'Consultor de Oncologia Personalizada', role: 'Vendas Medicina de Precisão', type: 'vendas_especialidade', category: 'especialidade', description: 'Fechamento de exames genéticos.', training: 'Persona resiliente e esperançosa.', icon: ShieldCheck, status: 'active' },
  { id: 've20', name: 'Avaliador de Lentes de Contato Dental', role: 'Vendas Odontologia Estética', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende transformações do sorriso com facetas.', training: 'Foco em status e aprovação social.', icon: DollarSign, status: 'active' },
  { id: 've21', name: 'Consultor de Bioestimuladores Corporais', role: 'Vendas Dermatologia Estética', type: 'vendas_especialidade', category: 'especialidade', description: 'Vende protocolos para flacidez e celulite.', training: 'Foco em autoconfiança.', icon: Sparkles, status: 'active' },
  { id: 'sc1', name: 'Triagem Inteligente FlowUp', role: 'Qualificador de Leads', type: 'suporte_conversao', category: 'comercial', description: 'Analisa o perfil financeiro e urgência de cada lead.', training: 'Persona comercial ágil.', icon: Sparkles, status: 'active' },
  { id: 'sc2', name: 'Recuperador de Orçamentos', role: 'Pós-Venda Comercial', type: 'suporte_conversao', category: 'comercial', description: 'Reengaja orçamentos pendentes com gatilhos de escassez.', training: 'Argumentação sobre valor vs preço.', icon: TrendingUp, status: 'active' },
  { id: 'sc3', name: 'Reativador de Inativos', role: 'Gestor de LTV', type: 'suporte_conversao', category: 'comercial', description: 'Busca pacientes que não voltam há mais de 1 ano.', training: 'Persona nostálgica e atenciosa.', icon: Users, status: 'active' },
  { id: 'sc4', name: 'Analisador de Objeções', role: 'Suporte à Conversão', type: 'suporte_conversao', category: 'comercial', description: 'Identifica padrões de perda de vendas.', training: 'Analista de dados.', icon: BarChart3, status: 'active' },
  { id: 'rc1', name: 'Dr. Resumo de Prontuário', role: 'Apoio Médico', type: 'rotina_clinica', category: 'clinico', description: 'Sintetiza históricos longos para otimizar consultas.', training: 'Foco em diagnósticos e alergias.', icon: Stethoscope, status: 'active' },
  { id: 'rc2', name: 'Assistente de Anamnese Digital', role: 'Coletor de Dados', type: 'rotina_clinica', category: 'clinico', description: 'Realiza pré-consulta via chat.', training: 'Persona empática.', icon: MessageSquare, status: 'active' },
  { id: 'rc3', name: 'Anjo do Pós-Cuidado', role: 'Monitoramento Remoto', type: 'rotina_clinica', category: 'paciente', description: 'Monitora recuperação cirúrgica 24/7.', training: 'Protocolos de segurança.', icon: Bell, status: 'active' },
  { id: 'rc4', name: 'Auditor de Fotos Técnicas', role: 'Gestor de Evolução', type: 'rotina_clinica', category: 'clinico', description: 'Garante padrão de angulação clínica.', training: 'Visão computacional básica.', icon: SearchIcon, status: 'active' },
  { id: 'rc5', name: 'Guardião LGPD e Compliance', role: 'Segurança de Dados', type: 'rotina_clinica', category: 'administrativo', description: 'Audita termos de consentimento.', training: 'Compliance em saúde.', icon: ShieldCheck, status: 'active' }
];

// ======================== UI COMPONENTS ========================

const SidebarItem = ({ icon: Icon, label, active, onClick, badge, collapsed }: { icon: any; label: string; active?: boolean; onClick?: () => void; badge?: number | string; collapsed?: boolean }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group relative font-medium ${
      active 
        ? 'active text-white' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
    {!collapsed && <span className="text-[13px] tracking-wide">{label}</span>}
    {badge !== undefined && !collapsed && (
      <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
        {badge}
      </span>
    )}
  </button>
);

const StatCard = ({ label, value, icon: Icon, color, trend }: { label: string; value: string | number; icon: any; color: string; trend?: string }) => (
  <motion.div 
    whileHover={{ y: -8 }} 
    className="wow-card p-6 flex flex-col gap-5"
  >
    <div className="flex items-center justify-between">
      <div className={`p-3.5 rounded-2xl ${color} text-white shadow-2xl shadow-current/30`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 uppercase tracking-widest">
            {trend}
          </span>
        </div>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
      <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{value}</h3>
    </div>
  </motion.div>
);

const AgentCard = ({ agent }: { agent: AIAgent }) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.02 }} 
    className="wow-card p-6 flex flex-col gap-4 group cursor-pointer relative overflow-hidden"
  >
    <div className={`w-12 h-12 rounded-2xl ${agent.status === 'active' ? 'bg-blue-600 shadow-blue-500/30' : 'bg-slate-100 text-slate-400'} flex items-center justify-center text-white shadow-lg transition-all`}>
      <BrainCircuit className="w-6 h-6" />
    </div>
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-sm font-black text-slate-900 truncate">{agent.name}</h4>
        <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{agent.description}</p>
    </div>
    <div className="pt-2 flex items-center justify-between border-t border-slate-50">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{agent.status === 'active' ? 'Operacional' : 'Pausado'}</span>
      <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:underline">Configurar</button>
    </div>
  </motion.div>
);

const Dashboard = () => (
  <div className="p-8 lg:p-12 space-y-12 fade-in overflow-y-auto h-full custom-scrollbar bg-[#f8fafc]">
    {/* Welcome Section */}
    <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-10 lg:p-16 text-white shadow-2xl border border-white/5">
      <div className="relative z-10 space-y-8 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600/10 backdrop-blur-md rounded-full border border-blue-500/20 text-blue-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Nexus Intelligence v2.0</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl lg:text-7xl font-black tracking-tighter leading-[0.9]">
            Bom dia,<br/>Ricardo<span className="text-blue-600">.</span> 👋
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-lg">
            Sua clínica está operando com <span className="text-white font-bold">eficiência máxima</span>. A IA já triou 42 leads hoje.
          </p>
        </div>
        <div className="flex gap-4 pt-4">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-2xl shadow-blue-600/40 hover:bg-blue-700 transition-all hover:-translate-y-1 active:scale-95">Relatório Completo</button>
          <button className="px-8 py-4 bg-white/5 backdrop-blur-md text-white rounded-2xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-all active:scale-95">Treinar Agentes</button>
        </div>
      </div>
      
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>
    </div>

    {/* Metrics Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
      <StatCard label="Leads Convertidos" value="24" icon={TrendingUp} color="bg-blue-600" trend="+12%" />
      <StatCard label="Consultas Hoje" value="156" icon={Calendar} color="bg-indigo-600" trend="+5%" />
      <StatCard label="Satisfação Média" value="4.9" icon={Sparkles} color="bg-amber-500" trend="Top 1%" />
      <StatCard label="Faturamento" value="R$ 124k" icon={DollarSign} color="bg-emerald-600" trend="+18%" />
    </div>

    {/* Secondary Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Atividade Recente</h2>
          <button className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver Histórico</button>
        </div>
        <div className="wow-card p-4 divide-y divide-slate-50">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-6 p-6 hover:bg-slate-50/50 transition-all first:rounded-t-[24px] last:rounded-b-[24px] group">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all shrink-0">
                <UserCircle className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold group-hover:text-blue-600 transition-all">Novo lead qualificado: Maria Eduarda</p>
                <p className="text-slate-400 text-sm mt-1">Interessada em Harmonização Facial • 14:30h</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-tighter">Alta Conversão</span>
                <button className="p-2 hover:bg-blue-50 rounded-xl text-blue-600 transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nexus AI Insight</h2>
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[40px] p-8 text-white space-y-8 relative overflow-hidden group shadow-2xl">
          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-white/10">
            <BrainCircuit className="w-8 h-8 text-blue-400" />
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-bold leading-tight">Otimize seu Retorno</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Leads vindos do Instagram convertem 25% mais rápido quando respondidos em até 5 minutos. Ative o agente de vendas para automação total.
            </p>
          </div>
          <button className="w-full py-4 bg-blue-600 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/40 hover:bg-blue-700 transition-all active:scale-95">Ativar Automação</button>
          
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-700" />
        </div>
      </div>
    </div>
  </div>
);

const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, confirmLabel, danger }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; danger?: boolean }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-center">
        <div className={`w-14 h-14 ${danger ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center mx-auto`}>
          {danger ? <Trash2 className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} className={`w-full py-2.5 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl font-bold text-sm transition-colors`}>{confirmLabel || 'Confirmar'}</button>
          <button onClick={onCancel} className="w-full py-2.5 text-slate-400 font-bold text-sm">Cancelar</button>
        </div>
      </motion.div>
    </div>
  );
};

    </div>
    <div><h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{agent.name}</h3><p className="text-[10px] font-semibold text-slate-400">{agent.role}</p></div>
    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{agent.description}</p>
  </motion.div>
);

// ======================== PATIENT 360 ========================
const Patient360 = ({ patient, onBack, onRefresh }: { patient: Patient; onBack: () => void; onRefresh: () => void }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [sel, setSel] = useState<MedicalRecord | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSign, setShowSign] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(patient);
  const [saving, setSaving] = useState(false);

  const fetchRec = useCallback(() => { fetch(`/api/patients/${patient.id}/records`).then(r => r.json()).then(setRecords).catch(() => {}); }, [patient.id]);
  useEffect(() => { fetchRec(); }, [fetchRec]);

  const handleSign = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      const r = await fetch('/api/medical-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sel, content: editContent, locked: 1, signed_at: new Date().toISOString() }) });
      if (r.ok) { setShowSign(false); setSel(null); fetchRec(); }
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      const r = await fetch('/api/medical-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sel, content: editContent }) });
      if (r.ok) { setSel(null); fetchRec(); }
    } finally { setSaving(false); }
  };

  const handleDel = async () => {
    await fetch(`/api/patients/${patient.id}`, { method: 'DELETE' });
    setShowDel(false); onRefresh(); onBack();
  };

  const handleUpd = async () => {
    setSaving(true);
    try {
      await fetch(`/api/patients/${patient.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) });
      setEditing(false); onRefresh();
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">{patient.full_name[0]}</div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">{patient.full_name}</h2>
          <p className="text-xs text-slate-500">{fmtPhone(patient.phone || '')} {patient.email ? `• ${patient.email}` : ''}</p>
        </div>
        <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => setShowDel(true)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900">Histórico Clínico</h3>
            <button className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Nova Evolução</button>
          </div>
          <div className="flex flex-col gap-4">
            {records.map(r => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase">{r.entry_type === 'evolution' ? 'Evolução' : 'Avaliação'}</span>
                    {!!r.locked && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded">Assinado</span>}
                    <span className="text-[10px] text-slate-400">• Dr(a). {r.professional_name || 'Profissional'}</span>
                  </div>
                  <button onClick={() => { setSel(r); setEditContent(r.content); }} className="text-[11px] font-bold text-blue-600 hover:underline">{r.locked ? 'Ver' : 'Editar'}</button>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{r.content}</p>
              </div>
            ))}
            {!records.length && <p className="text-center py-8 text-sm text-slate-400 italic">Nenhum registro clínico.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Informações</h3>
          <div className="flex flex-col gap-3 text-sm">
            <div><span className="text-[10px] font-bold text-slate-400 uppercase block">WhatsApp</span><span className="text-slate-900 font-medium">{fmtPhone(patient.phone || '')}</span></div>
            <div><span className="text-[10px] font-bold text-slate-400 uppercase block">E-mail</span><span className="text-slate-900">{patient.email || '-'}</span></div>
            <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Fonte</span><span className="text-slate-900">{patient.source || '-'}</span></div>
            <div><span className="text-[10px] font-bold text-slate-400 uppercase block">CPF</span><span className="text-slate-900">{patient.document_number || '-'}</span></div>
            <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Nascimento</span><span className="text-slate-900">{patient.birth_date || '-'}</span></div>
          </div>
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Registro {sel.locked ? '(Assinado)' : ''}</h3>
              <button onClick={() => setSel(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase"><span>Dr(a). {sel.professional_name}</span> <span className="ml-3">{new Date(sel.created_at).toLocaleString('pt-BR')}</span></div>
            <textarea disabled={!!sel.locked} value={editContent} onChange={e => setEditContent(e.target.value)}
              className={`w-full p-4 rounded-xl border-0 outline-none text-sm leading-relaxed min-h-[180px] ${sel.locked ? 'bg-slate-100/50 cursor-not-allowed text-slate-400' : 'bg-slate-50 text-slate-700'}`} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setSel(null)} className="px-5 py-2 rounded-lg text-slate-500 font-bold text-sm">Fechar</button>
              {!sel.locked && (
                <>
                  <button onClick={() => setShowSign(true)} disabled={saving} className="px-5 py-2 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg font-bold text-sm hover:bg-emerald-200">Assinar</button>
                  <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
      <ConfirmDialog open={showSign} title="Assinar Prontuário" message="Esta ação não pode ser desfeita." onConfirm={handleSign} onCancel={() => setShowSign(false)} confirmLabel="Assinar" />
      <ConfirmDialog open={showDel} title="Excluir Paciente" message={`Excluir ${patient.full_name}?`} onConfirm={handleDel} onCancel={() => setShowDel(false)} confirmLabel="Excluir" danger />
      <Modal open={editing} onClose={() => setEditing(false)} title="Editar Paciente">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label><input value={editData.full_name} onChange={e => setEditData({ ...editData, full_name: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label><input value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label><input value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">CPF</label><input value={editData.document_number || ''} onChange={e => setEditData({ ...editData, document_number: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Nascimento</label><input type="date" value={editData.birth_date || ''} onChange={e => setEditData({ ...editData, birth_date: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
        </div>
        <div className="flex justify-end gap-2"><button onClick={() => setEditing(false)} className="px-5 py-2 rounded-lg text-slate-500 font-bold text-sm">Cancelar</button><button onClick={handleUpd} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</button></div>
      </Modal>
    </div>
  );
};

// ======================== WHATSAPP CHAT — IMPROVED ========================
const WAChatView = ({ instanceId, chat, onToggleContact }: { instanceId: string; chat: WAChat; onToggleContact: () => void }) => {
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMsgs = useCallback(async (noLoader?: boolean) => {
    if (!noLoader) setLoading(true);
    try {
      const r = await fetch(`/api/whatsapp/instances/${instanceId}/chats/${encodeURIComponent(chat.jid)}/messages`);
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {} finally { if (!noLoader) setLoading(false); }
  }, [instanceId, chat.jid]);

  useEffect(() => {
    fetchMsgs();
    const interval = setInterval(() => fetchMsgs(true), 3000);
    return () => clearInterval(interval);
  }, [fetchMsgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/whatsapp/instances/${instanceId}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_jid: chat.jid, content: text.trim() })
      });
      if (r.ok) { setText(''); fetchMsgs(); }
    } finally { setSending(false); }
  };

  const handleKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const sameDay = (a: string, b: string) =>
    new Date(a).toDateString() === new Date(b).toDateString();

  const formatDateLabel = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderMsg = (msg: WAMessage, idx: number) => {
    const isMe = msg.from_me;
    const type = msg.message_type;
    const showDateDivider = idx === 0 || !sameDay(messages[idx - 1].timestamp, msg.timestamp);
    const showSender = chat.is_group && !isMe && (idx === 0 || messages[idx - 1].from_me || messages[idx - 1].chat_jid !== msg.chat_jid);

    return (
      <div key={msg.id} className="fade-in">
        {showDateDivider && (
          <div className="flex items-center justify-center my-6">
            <span className="text-[11px] font-bold text-slate-400 bg-slate-200/50 backdrop-blur-sm px-4 py-1.5 rounded-full uppercase tracking-wider">{formatDateLabel(msg.timestamp)}</span>
          </div>
        )}
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
          <div className={`max-w-[70%] ${isMe ? 'order-1' : 'order-2'}`}>
            {showSender && (
              <p className="text-[11px] font-bold text-blue-600 mb-1 ml-3 opacity-80 uppercase tracking-tight">{msg.mentioned_jids ? msg.mentioned_jids.split(',')[0]?.trim() || displayName(chat) : displayName(chat)}</p>
            )}
            <div className={`relative text-[14px] leading-relaxed shadow-sm transition-all ${
              isMe
                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm'
            } px-4 py-3`}>
              {msg.quoted_msg_id && (
                <div className={`flex items-center gap-2 mb-2 pl-2 border-l-2 ${isMe ? 'border-white/30 text-white/70' : 'border-slate-200 text-slate-500'} text-xs bg-black/5 py-1.5 rounded-r-md`}>
                  <Reply className="w-3 h-3 shrink-0" />
                  <span className="truncate italic">Resposta a mensagem anterior</span>
                </div>
              )}
              
              {type === 'image' && (
                <div className="mb-2 -mx-1 -mt-1">
                  <div className="rounded-xl overflow-hidden border border-black/5 bg-slate-100">
                    {msg.media_url ? (
                      <img src={msg.media_url} alt="" className="w-full h-auto max-h-80 object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-[10px] font-bold">Imagem expirada</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {type === 'audio' && (
                <div className={`flex items-center gap-3 mb-1 ${isMe ? 'bg-white/10' : 'bg-slate-50'} rounded-2xl px-4 py-3 min-w-[220px]`}>
                  <button className={`w-8 h-8 rounded-full ${isMe ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'} flex items-center justify-center shadow-sm`}>
                    <Mic className="w-4 h-4" />
                  </button>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className={`h-1.5 w-full ${isMe ? 'bg-white/30' : 'bg-slate-200'} rounded-full overflow-hidden`}>
                      <div className={`w-1/3 h-full ${isMe ? 'bg-white' : 'bg-blue-600'} rounded-full`} />
                    </div>
                    <span className={`text-[10px] font-bold ${isMe ? 'text-white/60' : 'text-slate-400'}`}>0:05</span>
                  </div>
                </div>
              )}

              {type === 'document' && (
                <div className={`flex items-center gap-3 mb-1 ${isMe ? 'bg-white/10' : 'bg-slate-50'} rounded-2xl px-4 py-3 min-w-[200px] border ${isMe ? 'border-white/20' : 'border-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-xl ${isMe ? 'bg-white/20' : 'bg-blue-50'} flex items-center justify-center`}>
                    <FileArchive className={`w-5 h-5 ${isMe ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{msg.media_name || 'Documento'}</p>
                    {msg.media_size && <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-slate-400'}`}>{(msg.media_size / 1024).toFixed(0)} KB</p>}
                  </div>
                  <Download className={`w-4 h-4 shrink-0 ${isMe ? 'opacity-60' : 'text-slate-400'}`} />
                </div>
              )}

              {msg.content && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
              )}

              <div className={`flex items-center justify-end gap-1.5 mt-1.5 ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                <span className="text-[10px] font-bold">{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                {isMe && (
                  <div className="flex">
                    {msg.id?.startsWith('wa_') ? <CheckCheck className="w-3.5 h-3.5 text-blue-200" /> : <Check className="w-3.5 h-3.5" />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="relative">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
            chat.is_group ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'
          }`}>
            {chat.is_group ? <UsersGroup className="w-5 h-5" /> : displayName(chat)[0]?.toUpperCase() || '?'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-slate-900 truncate">{displayName(chat)}</p>
            {chat.is_group && <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Grupo</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-xs font-medium text-slate-400">Online agora</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-all hover:text-blue-600"><Phone className="w-4.5 h-4.5" /></button>
          <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-all hover:text-blue-600"><Video className="w-4.5 h-4.5" /></button>
          <div className="w-px h-6 bg-slate-100 mx-1" />
          <button onClick={onToggleContact} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-all hover:text-blue-600 shadow-sm border border-slate-50" title="Detalhes do contato">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 opacity-50">
              <MessageSquare className="w-10 h-10" />
            </div>
            <p className="text-lg font-bold text-slate-600">Comece a conversa</p>
            <p className="text-sm max-w-[240px] text-center mt-2">Diga olá para {displayName(chat)} e inicie o atendimento especializado.</p>
          </div>
        ) : (
          <div className="pb-6">
            {messages.map((m, i) => renderMsg(m, i))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t border-slate-100 shrink-0">
        <div className="flex flex-col gap-3 bg-slate-50 rounded-2xl p-2 border border-slate-100 focus-within:border-blue-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5 transition-all duration-300">
          <div className="flex items-end gap-3 px-3 py-1">
            <div className="flex items-center gap-1 mb-1.5">
              <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors" title="Emojis"><Sparkles className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors" title="Anexo"><Paperclip className="w-5 h-5" /></button>
            </div>
            <textarea 
              value={text} 
              onChange={e => setText(e.target.value)} 
              onKeyDown={handleKey}
              placeholder="Escreva sua mensagem..." 
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none text-[15px] resize-none max-h-40 py-2.5 text-slate-700 leading-relaxed font-medium placeholder:text-slate-400" 
            />
            <button 
              onClick={send} 
              disabled={!text.trim() || sending}
              className={`p-3 rounded-xl transition-all mb-1 shadow-lg ${
                text.trim() 
                  ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5' 
                  : 'bg-slate-200 text-slate-400 shadow-none'
              }`}
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex items-center justify-between px-3 pb-1 pt-1 border-t border-slate-100/50">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"><Zap className="w-3.5 h-3.5" /> Respostas Rápidas</button>
              <button className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"><BrainCircuit className="w-3.5 h-3.5" /> Nexus AI</button>
            </div>
            <span className="text-[10px] font-bold text-slate-300">Pressione Enter para enviar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ======================== WHATSAPP CHAT LIST ========================
const WAChatList = ({ instanceId, onSelectChat, selectedJid }: { instanceId: string; onSelectChat: (chat: WAChat) => void; selectedJid?: string }) => {
  const [chats, setChats] = useState<WAChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchChats = () => {
      fetch(`/api/whatsapp/instances/${instanceId}/chats`)
        .then(r => r.json()).then(data => {
          setChats(Array.isArray(data) ? data : []);
          setLoading(false);
        }).catch(() => setLoading(false));
    };
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [instanceId]);

  const filtered = (chats || []).filter(c => {
    const matchesFilter = displayName(c).toLowerCase().includes(filter.toLowerCase());
    if (activeTab === 'unread') return matchesFilter && c.unread > 0;
    if (activeTab === 'groups') return matchesFilter && c.is_group;
    return matchesFilter;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Conversas</h2>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            placeholder="Buscar..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex gap-1 px-4 pb-2 border-b border-slate-100">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'unread', label: 'Não lidas' },
          { id: 'groups', label: 'Grupos' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {filtered.map(chat => {
              const isSelected = chat.jid === selectedJid;
              return (
                <button 
                  key={chat.jid} 
                  onClick={() => onSelectChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-all relative ${
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
                  
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm ${
                      chat.is_group
                        ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                        : 'bg-gradient-to-br from-blue-400 to-cyan-500'
                    }`}>
                      {chat.is_group ? <UsersGroup className="w-6 h-6" /> : displayName(chat)[0]?.toUpperCase() || '?'}
                    </div>
                    {chat.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm truncate ${isSelected || chat.unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {displayName(chat)}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                        {chat.last_message_time ? waTime(chat.last_message_time) : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {chat.is_group && <Tag className="w-3 h-3 text-slate-300" />}
                      <p className={`text-xs truncate ${chat.unread > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                        {chat.last_message_type === 'image' ? '🖼️ Foto' :
                         chat.last_message_type === 'audio' ? '🎵 Áudio' :
                         chat.last_message_type === 'video' ? '🎬 Vídeo' :
                         chat.last_message_type === 'document' ? '📄 Documento' :
                         chat.last_message || 'Nenhuma mensagem'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-40">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-sm font-bold">Nenhuma conversa</p>
            <p className="text-xs">Não encontramos chats com esse filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ======================== WHATSAPP INSTANCES ========================
const WAInstances = () => {
  const [instances, setInstances] = useState<WAInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInst = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/whatsapp/instances');
      const d = await r.json();
      setInstances(Array.isArray(d) ? d : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInst(); }, [fetchInst]);

  const createInstance = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await fetch('/api/whatsapp/instances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) });
      setNewName('');
      setShowNew(false);
      fetchInst();
    } finally { setCreating(false); }
  };

  const deleteInstance = async (id: string) => {
    await fetch(`/api/whatsapp/instances/${id}`, { method: 'DELETE' });
    fetchInst();
    if (expandedId === id) setExpandedId(null);
  };

  const statusColor = (s: string) => s === 'connected' ? 'bg-green-500' : s === 'waiting_qr' ? 'bg-amber-500' : 'bg-slate-300';
  const statusLabel = (s: string) => s === 'connected' ? 'Conectado' : s === 'waiting_qr' ? 'Aguardando QR' : s === 'disconnected' ? 'Desconectado' : s;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Conexões WhatsApp</h2>
          <p className="text-sm text-slate-500">Gerencie suas instâncias do WhatsApp.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /> Nova Conexão</button>
      </div>

      {/* Info box */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-800">WhatsApp Nexus 360</p>
          <p className="text-xs text-emerald-600">Conecte-se ao WhatsApp para enviar e receber mensagens, gerenciar grupos e automatizar atendimentos. Escaneie o QR Code com o WhatsApp do seu celular.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {instances.map(inst => {
            const isExpanded = expandedId === inst.id;
            let qrCodeUrl = '';
            try { if (inst.qrcode) { const parsed = JSON.parse(inst.qrcode); qrCodeUrl = parsed.qrcode || ''; } } catch { qrCodeUrl = inst.qrcode || ''; }
            return (
              <motion.div key={inst.id} layout className={`bg-white rounded-2xl border ${isExpanded ? 'border-blue-200 shadow-md' : 'border-slate-100 shadow-sm'} overflow-hidden`}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inst.status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{inst.name}</p>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${statusColor(inst.status)}`} />
                          <span className="text-[11px] text-slate-500">{statusLabel(inst.status)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : inst.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {inst.phone && <p className="text-xs text-slate-500 mb-2">{fmtPhone(inst.phone)}</p>}

                  {/* QR Code */}
                  {inst.status === 'waiting_qr' && qrCodeUrl && (
                    <div className="flex flex-col items-center py-3 border-t border-slate-50 mt-3">
                      <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36 rounded-xl bg-white p-2 border border-slate-100" />
                      <p className="text-[10px] text-slate-400 mt-2">Escaneie com o WhatsApp</p>
                      {inst.pairing_code && <p className="text-xs font-bold text-blue-600 mt-1">Código: {inst.pairing_code}</p>}
                    </div>
                  )}
                </div>

                {/* Expanded actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 overflow-hidden">
                      <div className="p-4 bg-slate-50 flex flex-col gap-2">
                        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-white transition-colors flex items-center gap-2"><ScanLine className="w-4 h-4 text-blue-500" /> Exibir QR Code</button>
                        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-white transition-colors flex items-center gap-2"><Plug className="w-4 h-4 text-green-500" /> Reconectar</button>
                        <button onClick={() => deleteInstance(inst.id)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-white transition-colors flex items-center gap-2"><Trash2 className="w-4 h-4" /> Excluir Conexão</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Empty state */}
          {!instances.length && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
              <Smartphone className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-bold text-slate-500">Nenhuma conexão ativa</p>
              <p className="text-xs mb-4">Clique em "Nova Conexão" para conectar seu WhatsApp.</p>
              <button onClick={() => setShowNew(true)} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Nova Conexão</button>
            </div>
          )}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Conexão WhatsApp">
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Instância</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: WhatsApp Principal" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm focus:ring-2 focus:ring-blue-500/20" autoFocus />
          <p className="text-xs text-slate-400">Após criar, um QR Code será gerado. Escaneie com o WhatsApp do seu celular para conectar.</p>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => setShowNew(false)} className="px-5 py-2 rounded-lg text-slate-500 font-bold text-sm">Cancelar</button>
          <button onClick={createInstance} disabled={!newName.trim() || creating} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm disabled:opacity-50">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Conexão'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

// ======================== CONTACT SIDEBAR ========================
const ContactSidebar = ({ chat, onClose }: { chat: WAChat; onClose: () => void }) => {
  const [lead, setLead] = useState<any | null>(null);
  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', status: 'new', notes: '' });

  const phone = chat.phone || chat.jid?.split('@')[0] || '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [leadsRes, patientsRes] = await Promise.all([
          fetch(`/api/leads?search=${encodeURIComponent(phone)}`),
          fetch(`/api/patients?search=${encodeURIComponent(phone)}`),
        ]);
        const leads = await leadsRes.json();
        const patients = await patientsRes.json();
        const foundLead = Array.isArray(leads) ? leads.find((l: any) => l.phone === phone) : null;
        const foundPatient = Array.isArray(patients) ? patients.find((p: any) => p.phone === phone) : null;
        setLead(foundLead || null);
        setPatient(foundPatient || null);
        setForm({
          name: foundLead?.name || foundPatient?.full_name || displayName(chat),
          phone: foundLead?.phone || foundPatient?.phone || phone,
          email: foundLead?.email || foundPatient?.email || '',
          status: foundLead?.status || 'new',
          notes: foundLead?.notes || '',
        });
      } catch {} finally { setLoading(false); }
    };
    load();
  }, [phone, chat]);

  const saveLead = async () => {
    try {
      if (lead) {
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        const r = await fetch('/api/leads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, source: 'WhatsApp' }),
        });
        if (r.ok) setEditing(false);
      }
      setEditing(false);
    } catch {}
  };

  return (
    <div className="w-[340px] border-l border-slate-100 bg-white flex flex-col h-full shrink-0 shadow-xl z-10 fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" /> Detalhes
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Avatar Section */}
          <div className="flex flex-col items-center py-8 px-6 bg-slate-50/50">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300 ${
              chat.is_group
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                : 'bg-gradient-to-br from-blue-500 to-cyan-600'
            }`}>
              {chat.is_group ? <UsersGroup className="w-10 h-10" /> : displayName(chat)[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-lg font-bold text-slate-900 text-center truncate max-w-full px-2">{displayName(chat)}</p>
            <p className="text-sm font-medium text-slate-400 mt-1">{chat.is_group ? 'Grupo do WhatsApp' : fmtPhone(phone)}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {patient && (
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200">Paciente</span>
              )}
              {lead && (
                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-200">Lead</span>
              )}
              {!lead && !patient && (
                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">Novo Contato</span>
              )}
            </div>
          </div>

          {/* Form / Details Section */}
          <div className="p-6 space-y-6">
            {editing ? (
              <div className="flex flex-col gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Field label="Nome Completo">
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full text-[14px] px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" />
                </Field>
                <div className="grid grid-cols-1 gap-5">
                  <Field label="Telefone">
                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full text-[14px] px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" />
                  </Field>
                  <Field label="E-mail">
                    <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full text-[14px] px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium" />
                  </Field>
                </div>
                <Field label="Estágio do Funil">
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full text-[14px] px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium appearance-none">
                    <option value="new">Novo Lead</option>
                    <option value="qualification">Em Qualificação</option>
                    <option value="proposal">Proposta Enviada</option>
                    <option value="closed_won">Paciente Convertido</option>
                    <option value="closed_lost">Perdido</option>
                  </select>
                </Field>
                <Field label="Notas e Observações">
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={4} className="w-full text-[14px] px-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium resize-none" />
                </Field>
                <div className="flex gap-3 pt-2">
                  <button onClick={saveLead} className="flex-1 bg-blue-600 text-white text-sm font-bold px-4 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95">
                    <Save className="w-4 h-4" /> Salvar Alterações
                  </button>
                  <button onClick={() => setEditing(false)} className="px-5 py-3 text-sm text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Phone className="w-5 h-5" /></div>
                    <Field label="Telefone Principal" value={fmtPhone(form.phone)} />
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0"><Mail className="w-5 h-5" /></div>
                    <Field label="E-mail" value={form.email} />
                  </div>
                  {lead && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0"><TrendingUp className="w-5 h-5" /></div>
                      <Field label="Status Atual" value={lead.status.replace('_', ' ').toUpperCase()} />
                    </div>
                  )}
                  {form.notes && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><FileText className="w-5 h-5" /></div>
                      <Field label="Observações Internas" value={form.notes} />
                    </div>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button onClick={() => setEditing(true)} className="w-full border-2 border-slate-100 text-slate-700 text-sm font-bold px-4 py-3.5 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Pencil className="w-4 h-4" /> {lead ? 'Editar Informações' : 'Converter em Lead'}
                  </button>
                  {!patient && (
                    <button className="w-full bg-emerald-600 text-white text-sm font-bold px-4 py-3.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98]">
                      <UserPlus className="w-4 h-4" /> Criar Ficha de Paciente
                    </button>
                  )}
                  {patient && (
                    <button className="w-full bg-slate-900 text-white text-sm font-bold px-4 py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98]">
                      <ExternalLink className="w-4 h-4" /> Abrir Prontuário 360
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, children }: { label: string; value?: string; children?: ReactNode }) => (
  <div>
    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{label}</label>
    {children || <p className="text-sm text-slate-700">{value || '—'}</p>}
  </div>
);

// ======================== WHATSAPP MAIN VIEW ========================
const WAMain = () => {
  const [instances, setInstances] = useState<WAInstance[]>([]);
  const [selectedChat, setSelectedChat] = useState<WAChat | null>(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [showContactPanel, setShowContactPanel] = useState(true);

  const fetchInstances = useCallback(() => {
    fetch('/api/whatsapp/instances').then(r => r.json()).then(d => {
      const arr = Array.isArray(d) ? d : [];
      setInstances(arr);
      if (arr.length > 0 && !activeInstanceId) setActiveInstanceId(arr[0].id);
    }).catch(() => {});
  }, [activeInstanceId]);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 10000);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  const connected = instances.filter(i => i.status === 'connected');

  if (!connected.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-12">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
          <WifiOff className="w-10 h-10" />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-xl font-bold text-slate-900 mb-2">WhatsApp Desconectado</p>
          <p className="text-sm text-slate-500 leading-relaxed">Não encontramos nenhuma conexão ativa. Conecte seu WhatsApp para começar a atender seus pacientes.</p>
        </div>
        <button onClick={() => setActiveTab('conexoes')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">Configurar Conexão</button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden fade-in">
      {/* Left: Chat List */}
      <div className="w-[360px] shrink-0">
        {activeInstanceId && <WAChatList instanceId={activeInstanceId} onSelectChat={setSelectedChat} selectedJid={selectedChat?.jid} />}
      </div>

      {/* Center: Messages or Empty */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        {selectedChat && activeInstanceId ? (
          <WAChatView instanceId={activeInstanceId} chat={selectedChat} onToggleContact={() => setShowContactPanel(p => !p)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-8 rotate-6">
              <MessageSquare className="w-10 h-10 text-blue-500 opacity-40" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Bem-vindo ao Atendimento</h2>
            <p className="text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">Selecione uma conversa ao lado para visualizar o histórico e responder seus pacientes em tempo real.</p>
            
            {instances.length > 1 && (
              <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-3 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <select value={activeInstanceId || ''} onChange={e => setActiveInstanceId(e.target.value)} className="border-0 outline-none text-sm font-bold text-slate-700 bg-transparent cursor-pointer">
                  {instances.map(i => <option key={i.id} value={i.id}>{i.name} ({i.status === 'connected' ? 'Ativo' : 'Pendente'})</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Contact Panel */}
      {selectedChat && showContactPanel && (
        <ContactSidebar chat={selectedChat} onClose={() => setShowContactPanel(false)} />
      )}
    </div>
  );
};

// Need this for the WAMain
let setActiveTab: (tab: string) => void;

// ======================== MAIN APP ========================
export default function App() {
  const [activeTab, setActiveTabState] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  const [showDeletePatient, setShowDeletePatient] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editPatientData, setEditPatientData] = useState<Patient | null>(null);

  const [newPatient, setNewPatient] = useState({ full_name: '', phone: '', email: '', source: 'Manual', document_number: '', birth_date: '' });
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', source: 'Instagram' });
  const [newAppt, setNewAppt] = useState({ full_name: '', phone: '', email: '', date: '', time: '', notes: '' });
  const [formErrors, setFormErrors] = useState({ full_name: '', phone: '', email: '', date: '', time: '' });
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  setActiveTab = setActiveTabState;

  const fetchPatients = useCallback(() => {
    const url = searchQuery ? `/api/patients?search=${encodeURIComponent(searchQuery)}` : '/api/patients';
    fetch(url).then(r => r.json()).then(setPatients).catch(() => {});
  }, [searchQuery]);
  const fetchLeads = useCallback(() => { fetch('/api/leads').then(r => r.json()).then(d => setLeads(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const fetchAppts = useCallback(() => { fetch(`/api/appointments?date=${agendaDate}`).then(r => r.json()).then(d => setAppointments(Array.isArray(d) ? d : [])).catch(() => {}); }, [agendaDate]);

  useEffect(() => { fetch('/api/dashboard/stats').then(r => r.json()).then(setStats).catch(() => {}); fetchPatients(); fetchLeads(); }, []);
  useEffect(() => { if (activeTab === 'agenda') fetchAppts(); }, [activeTab, agendaDate, fetchAppts]);
  useEffect(() => { if (activeTab === 'crm') fetchLeads(); }, [activeTab, fetchLeads]);
  useEffect(() => { if (activeTab === 'patients') fetchPatients(); }, [activeTab, searchQuery, fetchPatients]);

  const val = (d: any) => {
    const e = { full_name: !d.full_name ? 'Obrigatório' : '', phone: validatePhone(d.phone) || '', email: !validateEmail(d.email) ? 'E-mail inválido' : '', date: d.date !== undefined && !d.date ? 'Obrigatória' : '', time: d.time !== undefined && !d.time ? 'Obrigatória' : '' };
    setFormErrors(e);
    return !e.full_name && !e.phone && !e.email && !e.date && !e.time;
  };
  const rst = () => { setNewPatient({ full_name: '', phone: '', email: '', source: 'Manual', document_number: '', birth_date: '' }); setNewLead({ name: '', phone: '', email: '', source: 'Instagram' }); setNewAppt({ full_name: '', phone: '', email: '', date: agendaDate, time: '', notes: '' }); setFormErrors({ full_name: '', phone: '', email: '', date: '', time: '' }); };

  const savePatient = async () => {
    if (!val(newPatient)) return;
    setSaving(true);
    try { const r = await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPatient) }); if (r.ok) { setIsAddingPatient(false); rst(); fetchPatients(); } } finally { setSaving(false); }
  };
  const saveLead = async () => {
    if (!val(newLead)) return;
    setSaving(true);
    try { const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLead) }); if (r.ok) { setIsAddingLead(false); rst(); fetchLeads(); } } finally { setSaving(false); }
  };
  const moveLead = async (id: string, s: string) => { await fetch(`/api/leads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) }); fetchLeads(); };
  const delLead = async (id: string) => { await fetch(`/api/leads/${id}`, { method: 'DELETE' }); fetchLeads(); };
  const saveAppt = async () => {
    if (!val(newAppt)) return;
    setSaving(true);
    try {
      const st = `${newAppt.date}T${newAppt.time}:00`;
      const ed = new Date(new Date(st).getTime() + 30 * 60000).toISOString().slice(0, 19);
      const r = await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newAppt, start_time: st, end_time: ed }) });
      if (r.ok) { setIsAddingAppointment(false); rst(); fetchAppts(); fetch('/api/dashboard/stats').then(r => r.json()).then(setStats).catch(() => {}); }
    } finally { setSaving(false); }
  };
  const cancelAppt = async (id: string) => { await fetch(`/api/appointments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }); fetchAppts(); };
  const deletePatient = async (id: string) => { await fetch(`/api/patients/${id}`, { method: 'DELETE' }); setShowDeletePatient(null); fetchPatients(); };
  const editPatientSave = async () => { if (!editPatientData) return; setSaving(true); try { await fetch(`/api/patients/${editPatientData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editPatientData) }); setEditingPatient(null); fetchPatients(); } finally { setSaving(false); } };

  const sp = patients.find(p => p.id === selectedPatientId);
  const leadCols = [
    { key: 'new', label: 'Novos', color: 'bg-blue-500' },
    { key: 'qualification', label: 'Qualificação', color: 'bg-amber-500' },
    { key: 'scheduled', label: 'Agendados', color: 'bg-purple-500' },
    { key: 'closed', label: 'Fechados', color: 'bg-emerald-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Sidebar */}
      <aside className="nav-sidebar w-[280px] p-6 flex flex-col gap-10 sticky top-0 h-screen shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4 px-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(31,147,255,0.4)] rotate-3">N</div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter leading-none">NEXUS<span className="text-blue-500 text-2xl">.</span></h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Health Suite 360</p>
          </div>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar -mx-2 px-2">
          <div className="mb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Visão Geral</div>
          <SidebarItem icon={LayoutDashboard} label="Painel de Controle" active={activeTab === 'dashboard'} onClick={() => setActiveTabState('dashboard')} />
          <SidebarItem icon={MessageSquare} label="Atendimento Live" active={activeTab === 'atendimento'} onClick={() => setActiveTabState('atendimento')} badge={12} />
          
          <div className="mt-8 mb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Operação</div>
          <SidebarItem icon={Users} label="Base de Pacientes" active={activeTab === 'patients'} onClick={() => setActiveTabState('patients')} />
          <SidebarItem icon={TrendingUp} label="Funil de Vendas" active={activeTab === 'crm'} onClick={() => setActiveTabState('crm')} />
          <SidebarItem icon={Calendar} label="Agenda Inteligente" active={activeTab === 'agenda'} onClick={() => setActiveTabState('agenda')} />
          
          <div className="mt-8 mb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Ecossistema</div>
          <SidebarItem icon={Smartphone} label="Canais de Conexão" active={activeTab === 'conexoes'} onClick={() => setActiveTabState('conexoes')} />
          <SidebarItem icon={BrainCircuit} label="Nexus AI Agents" active={activeTab === 'ai_agents'} onClick={() => setActiveTabState('ai_agents')} />
          <SidebarItem icon={FileText} label="Gestão Documental" active={activeTab === 'docs'} onClick={() => setActiveTabState('docs')} />
          
          <div className="mt-auto pt-8">
            <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTabState('settings')} />
          </div>
        </nav>

        <div className="pt-6 border-t border-white/5">
          <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/5 group hover:bg-white/10 transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <UserCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">Dr. Ricardo A.</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4 bg-slate-100/50 px-4 py-2.5 rounded-2xl w-full max-w-md border border-slate-200/50 focus-within:bg-white focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
            <SearchIcon className="w-5 h-5 text-slate-400" />
            <input 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="Pesquisar em prontuários, leads ou agendamentos..." 
              className="bg-transparent border-0 outline-none text-[14px] w-full text-slate-700 font-medium placeholder:text-slate-400" 
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-200 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-500" /></button>}
          </div>
          
          <div className="flex items-center gap-5">
            <button 
              onClick={async () => { await fetch('/api/mock/populate', { method: 'POST' }); window.location.reload(); }} 
              className="px-4 py-2 rounded-xl text-[11px] font-black text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all uppercase tracking-widest border border-transparent hover:border-blue-100"
            >
              Seed Demo
            </button>
            <div className="w-px h-8 bg-slate-100" />
            <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl relative transition-all group">
              <Bell className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && <Dashboard />}

          {/* PACIENTES */}
          {activeTab === 'patients' && (sp ? <Patient360 patient={sp} onBack={() => setSelectedPatientId(null)} onRefresh={fetchPatients} /> : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div><h2 className="text-xl font-bold text-slate-900">Pacientes</h2><p className="text-sm text-slate-500">{patients.length} pacientes cadastrados.</p></div>
                <button onClick={() => { rst(); setIsAddingPatient(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Novo Paciente</button>
              </div>

              <Modal open={isAddingPatient} onClose={() => setIsAddingPatient(false)} title="Cadastrar Paciente">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label><input value={newPatient.full_name} onChange={e => setNewPatient({ ...newPatient, full_name: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.full_name ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} />{formErrors.full_name && <span className="text-[10px] text-red-500">{formErrors.full_name}</span>}</div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label><input value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.phone ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} />{formErrors.phone && <span className="text-[10px] text-red-500">{formErrors.phone}</span>}</div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label><input value={newPatient.email} onChange={e => setNewPatient({ ...newPatient, email: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.email ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} />{formErrors.email && <span className="text-[10px] text-red-500">{formErrors.email}</span>}</div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">CPF</label><input value={newPatient.document_number} onChange={e => setNewPatient({ ...newPatient, document_number: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Nascimento</label><input type="date" value={newPatient.birth_date} onChange={e => setNewPatient({ ...newPatient, birth_date: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
                  <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Fonte</label><select value={newPatient.source} onChange={e => setNewPatient({ ...newPatient, source: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm"><option value="Manual">Manual</option><option value="Instagram">Instagram</option><option value="Indicação">Indicação</option><option value="Google">Google</option><option value="Google Ads">Google Ads</option></select></div>
                </div>
                <div className="flex justify-end gap-2"><button onClick={() => setIsAddingPatient(false)} className="px-4 py-2 rounded-lg text-slate-500 font-bold text-sm">Cancelar</button><button onClick={savePatient} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</button></div>
              </Modal>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-left">Paciente</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-left">Contato</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-left">Fonte</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-left hidden md:table-cell">Cadastro</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Ações</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {patients.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5"><div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setSelectedPatientId(p.id)}>
                            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">{p.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>
                            <div><p className="text-sm font-bold text-slate-900">{p.full_name}</p></div>
                          </div></td>
                          <td className="px-4 py-3.5"><p className="text-sm text-slate-600">{p.phone ? fmtPhone(p.phone) : '-'}</p></td>
                          <td className="px-4 py-3.5"><span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">{p.source || 'Manual'}</span></td>
                          <td className="px-4 py-3.5 hidden md:table-cell"><p className="text-sm text-slate-600">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p></td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setEditingPatient(p); setEditPatientData(p); }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setSelectedPatientId(p.id)} className="text-xs font-bold text-blue-600 hover:underline px-1.5">Ficha</button>
                              <button onClick={() => setShowDeletePatient(p.id)} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!patients.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400 italic">Nenhum paciente. Use "Seed Demo" para carregar dados.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <Modal open={!!editingPatient} onClose={() => setEditingPatient(null)} title="Editar Paciente">
                {editPatientData && <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label><input value={editPatientData.full_name} onChange={e => setEditPatientData({ ...editPatientData, full_name: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label><input value={editPatientData.phone || ''} onChange={e => setEditPatientData({ ...editPatientData, phone: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label><input value={editPatientData.email || ''} onChange={e => setEditPatientData({ ...editPatientData, email: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
                </div>}
                <div className="flex justify-end gap-2"><button onClick={() => setEditingPatient(null)} className="px-4 py-2 rounded-lg text-slate-500 font-bold text-sm">Cancelar</button><button onClick={editPatientSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</button></div>
              </Modal>
              <ConfirmDialog open={!!showDeletePatient} title="Excluir Paciente" message="Excluir este paciente?" onConfirm={() => showDeletePatient && deletePatient(showDeletePatient)} onCancel={() => setShowDeletePatient(null)} confirmLabel="Excluir" danger />
            </div>
          ))}

          {/* CRM */}
          {activeTab === 'crm' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div><h2 className="text-xl font-bold text-slate-900">Pipeline Comercial</h2><p className="text-sm text-slate-500">{leads.length} leads no total.</p></div>
                <button onClick={() => { rst(); setIsAddingLead(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Novo Lead</button>
              </div>

              <Modal open={isAddingLead} onClose={() => setIsAddingLead(false)} title="Novo Lead">
                <div className="flex flex-col gap-3">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label><input value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.full_name ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label><input value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.phone ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label><input value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Origem</label><select value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm"><option value="Instagram">Instagram</option><option value="Google Ads">Google Ads</option><option value="Facebook">Facebook</option><option value="Site">Site</option><option value="Indicação">Indicação</option></select></div>
                </div>
                <div className="flex justify-end gap-2"><button onClick={() => setIsAddingLead(false)} className="px-4 py-2 rounded-lg text-slate-500 font-bold text-sm">Cancelar</button><button onClick={saveLead} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</button></div>
              </Modal>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {leadCols.map(col => {
                  const items = leads.filter(l => l.status === col.key);
                  const next = col.key === 'new' ? 'qualification' : col.key === 'qualification' ? 'scheduled' : col.key === 'scheduled' ? 'closed' : null;
                  const prev = col.key === 'closed' ? 'scheduled' : col.key === 'scheduled' ? 'qualification' : col.key === 'qualification' ? 'new' : null;
                  return (
                    <div key={col.key} className="bg-slate-100/50 rounded-2xl p-3 flex flex-col gap-3 border border-slate-200/50 min-h-[250px]">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${col.color}`} />{col.label}</h4>
                        <span className="text-xs font-bold text-slate-400">{items.length}</span>
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        {items.map(l => (
                          <motion.div key={l.id} layout whileHover={{ y: -1 }} className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-bold text-slate-900">{l.name}</p>
                              <button onClick={() => delLead(l.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {l.source && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded-md">{l.source}</span>}
                              {l.phone && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md">{l.phone}</span>}
                            </div>
                            <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                              <span>{new Date(l.created_at).toLocaleDateString('pt-BR')}</span>
                              <div className="flex gap-0.5">
                                {prev && <button onClick={() => moveLead(l.id, prev)} className="p-0.5 hover:bg-slate-100 rounded"><ChevronLeft className="w-3 h-3" /></button>}
                                {next && <button onClick={() => moveLead(l.id, next)} className="p-0.5 hover:bg-slate-100 rounded"><ChevronRight className="w-3 h-3" /></button>}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {!items.length && <div className="py-6 border border-dashed border-slate-200 rounded-xl flex items-center justify-center flex-1"><span className="text-[10px] text-slate-300">Vazio</span></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AGENDA */}
          {activeTab === 'agenda' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div><h2 className="text-xl font-bold text-slate-900">Agenda Clínica</h2><p className="text-sm text-slate-500">{appointments.length} consultas neste dia.</p></div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { const d = new Date(agendaDate); d.setDate(d.getDate() - 1); setAgendaDate(d.toISOString().split('T')[0]); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-bold text-slate-900 min-w-[180px] text-center">{new Date(agendaDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <button onClick={() => { const d = new Date(agendaDate); d.setDate(d.getDate() + 1); setAgendaDate(d.toISOString().split('T')[0]); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronRight className="w-4 h-4" /></button>
                    <button onClick={() => setAgendaDate(new Date().toISOString().split('T')[0])} className="text-xs font-bold text-blue-600 hover:underline ml-2">Hoje</button>
                  </div>
                  <button onClick={() => { rst(); setNewAppt({ ...newAppt, date: agendaDate }); setIsAddingAppointment(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Novo</button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-h-[400px]">
                {appointments.length ? (
                  <div className="flex flex-col gap-2">
                    {appointments.map(a => (
                      <div key={a.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                        <div className="w-20 text-center"><p className="text-base font-bold text-slate-900">{new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p><p className="text-[10px] text-slate-400">{new Date(a.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
                        <div className="w-0.5 h-10 bg-purple-400 rounded-full" />
                        <div className="flex-1"><p className="text-sm font-bold text-slate-900">{a.patient_name}</p><p className="text-xs text-slate-500">{a.professional_name}</p></div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.status === 'scheduled' ? 'bg-purple-50 text-purple-600' : a.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {a.status === 'scheduled' ? 'Confirmado' : a.status === 'cancelled' ? 'Cancelado' : 'Realizado'}
                        </span>
                        {a.status === 'scheduled' && <button onClick={() => cancelAppt(a.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="min-h-[350px] flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Calendar className="w-10 h-10 opacity-20" />
                    <div className="text-center"><p className="text-sm font-bold text-slate-500">Nenhuma consulta</p><p className="text-xs">Clique em "Novo" para agendar.</p></div>
                  </div>
                )}
              </div>

              <Modal open={isAddingAppointment} onClose={() => setIsAddingAppointment(false)} title="Agendar Consulta">
                <div className="flex flex-col gap-3">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Paciente</label><input value={newAppt.full_name} onChange={e => setNewAppt({ ...newAppt, full_name: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.full_name ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label><input value={newAppt.phone} onChange={e => setNewAppt({ ...newAppt, phone: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.phone ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label><input value={newAppt.email} onChange={e => setNewAppt({ ...newAppt, email: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Data</label><input type="date" value={newAppt.date} onChange={e => setNewAppt({ ...newAppt, date: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.date ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Hora</label><input type="time" value={newAppt.time} onChange={e => setNewAppt({ ...newAppt, time: e.target.value })} className={`w-full px-3 py-2.5 bg-slate-50 rounded-xl border ${formErrors.time ? 'border-red-300' : 'border-slate-100'} outline-none text-sm`} /></div>
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Obs</label><textarea value={newAppt.notes} onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 outline-none text-sm min-h-[60px]" /></div>
                </div>
                <div className="flex justify-end gap-2"><button onClick={() => setIsAddingAppointment(false)} className="px-4 py-2 rounded-lg text-slate-500 font-bold text-sm">Cancelar</button><button onClick={saveAppt} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}</button></div>
              </Modal>
            </div>
          )}

          {/* ATENDIMENTO */}
          {activeTab === 'atendimento' && (
            <div className="h-[calc(100vh-8rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <WAMain />
            </div>
          )}

          {/* CONEXOES */}
          {activeTab === 'conexoes' && <WAInstances />}

          {/* AGENTES IA */}
          {activeTab === 'ai_agents' && (
            <div className="flex flex-col gap-8">
              <div><h2 className="text-xl font-bold text-slate-900">Nexus AI Agents 🧠</h2><p className="text-sm text-slate-500">Inteligência Artificial especializada por área da saúde.</p></div>
              <div className="flex flex-col gap-10">
                {[
                  { type: 'vendas_especialidade' as const, title: 'Vendas por Especialidade', desc: 'Agentes focados em procedimentos específicos.', color: 'bg-indigo-600', icon: Stethoscope },
                  { type: 'suporte_conversao' as const, title: 'Suporte e Conversão Geral', desc: 'Triagem, reativação e recuperação de orçamentos.', color: 'bg-blue-600', icon: TrendingUp },
                  { type: 'rotina_clinica' as const, title: 'Rotinas e Atividades Clínicas', desc: 'Automação de prontuário, compliance e monitoramento.', color: 'bg-emerald-600', icon: ShieldCheck },
                ].map(section => (
                  <div key={section.type} className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${section.color} rounded-xl text-white shadow-sm`}><section.icon className="w-4 h-4" /></div>
                      <div><h3 className="text-base font-bold text-slate-900">{section.title}</h3><p className="text-xs text-slate-400">{section.desc}</p></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                      {AGENTS.filter(a => a.type === section.type).map(a => <AgentCard key={a.id} agent={a} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholders */}
          {activeTab === 'docs' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 gap-3">
              <FileText className="w-12 h-12 opacity-20" />
              <div className="text-center"><h3 className="text-lg font-bold text-slate-500">Documentos</h3><p className="text-sm">Gestão de documentos e exames em breve.</p></div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 gap-3">
              <Settings className="w-12 h-12 opacity-20" />
              <div className="text-center"><h3 className="text-lg font-bold text-slate-500">Ajustes</h3><p className="text-sm">Configurações em breve.</p></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}