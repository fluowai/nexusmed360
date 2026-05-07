import { 
  Users, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  MessageSquare, 
  Plus, 
  LayoutDashboard, 
  FileText, 
  Settings,
  Bell,
  Search,
  UserCircle,
  BrainCircuit,
  Sparkles,
  Bot,
  ShieldCheck,
  BarChart3,
  Stethoscope,
  Heart,
  Activity,
  Moon,
  Zap,
  Clock,
  ChevronRight,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

// --- Types ---
interface AIAgent {
  id: string;
  name: string;
  role: string;
  type: 'vendas_especialidade' | 'suporte_conversao' | 'rotina_clinica';
  category: 'comercial' | 'clinico' | 'administrativo' | 'marketing' | 'paciente' | 'especialidade';
  description: string;
  training: string;
  icon: any;
  status: 'active' | 'idle' | 'learning';
}
interface Stats {
  leads: { count: number };
  appointments: { count: number };
  patients: { count: number };
  revenue: { total: number };
}

interface Patient {
  id: string;
  tenant_id: string;
  full_name: string;
  social_name?: string;
  document_number?: string;
  birth_date?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  professional_id: string;
  professional_name: string;
  entry_type: string;
  content: string;
  signed_at?: string;
  locked: number;
  created_at: string;
}

// --- Validation Helpers ---
const validateEmail = (email: string) => {
  if (!email) return true; // Optional field
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return 'Telefone é obrigatório';
  
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const hasDDI = phone.startsWith('+');
  
  // Basic numeric check
  if (!/^\+?\d+$/.test(cleanPhone)) {
    return 'Telefone deve conter apenas números (e + para DDI)';
  }

  // Length checks (E.164 standard is up to 15 digits)
  if (cleanPhone.length < 10) {
    return 'Telefone muito curto (mínimo 10 dígitos)';
  }
  
  if (cleanPhone.length > 15) {
    return 'Telefone muito longo (máximo 15 dígitos)';
  }

  // Common Brazilian format check if no DDI is provided
  if (!hasDDI && cleanPhone.length === 11 && !cleanPhone.startsWith('0')) {
    // Looks like a valid BR mobile
    return null;
  }

  if (!hasDDI && cleanPhone.length === 10) {
    // Looks like a valid BR fixed line
    return null;
  }

  if (hasDDI && cleanPhone.length >= 11) {
    // Looks like a valid international format
    return null;
  }

  return 'Formato inválido. Use +DDI DDD Número ou DDD Número';
};

// --- Components ---

const AGENTS: AIAgent[] = [
  // --- VENDAS POR ESPECIALIDADE (20+ Agentes) ---
  {
    id: 've1',
    name: 'Consultor de Implantes Dentários',
    role: 'Vendas Odontologia',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Especialista em fechamento de protocolos de implantes e reabilitação oral.',
    training: 'Domínio técnico sobre titânio, carga imediata e estética. Focado em converter orçamentos de alto ticket.',
    icon: TrendingUp,
    status: 'active'
  },
  {
    id: 've2',
    name: 'Especialista em Invisalign',
    role: 'Vendas Ortodontia Premium',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Focado na conversão de pacientes para alinhadores invisíveis.',
    training: 'Persona tecnológica. Compara benefícios de alinhadores vs aparelhos fixos focando em lifestyle.',
    icon: Sparkles,
    status: 'active'
  },
  {
    id: 've3',
    name: 'Consultor de Harmonização Facial',
    role: 'Vendas Estética Avançada',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende planos de rejuvenescimento facial, botox e bioestimuladores.',
    training: 'Argumentação sobre beleza natural e proporção áurea. Vende autoestima e planos de manutenção.',
    icon: UserCircle,
    status: 'active'
  },
  {
    id: 've4',
    name: 'Avaliador de Transplante Capilar',
    role: 'Vendas Dermatologia Capilar',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Qualifica leads interessados em restauração capilar técnica FUE.',
    training: 'Abordagem empática sobre calvície. Foco na recuperação da autoimagem e densidade capilar.',
    icon: Search,
    status: 'active'
  },
  {
    id: 've5',
    name: 'Consultor de Lipoaspiração HD',
    role: 'Vendas Cirurgia Plástica',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Conversão de leads para cirurgias de contorno corporal de alta definição.',
    training: 'Explica tecnologias como Vaser/Renuvion. Foco em segurança cirúrgica e resultados atléticos.',
    icon: ShieldCheck,
    status: 'active'
  },
  {
    id: 've6',
    name: 'Consultor de Prótese de Mama',
    role: 'Vendas Cirurgia Plástica',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Especialista em fechamento de mamoplastia e mastopexia com prótese.',
    training: 'Persona acolhedora. Explica tipos de perfis, marcas de silicone e recuperação rápida.',
    icon: Heart,
    status: 'active'
  },
  {
    id: 've7',
    name: 'Especialista em Cirurgia Refrativa',
    role: 'Vendas Oftalmologia',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Converte pacientes que buscam independência total de óculos via laser.',
    training: 'Vende liberdade visual e praticidade. Explica os riscos mínimos e o fim da dependência.',
    icon: Stethoscope,
    status: 'active'
  },
  {
    id: 've8',
    name: 'Mentor de Emagrecimento Clínico',
    role: 'Vendas Nutrologia/Endocrino',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende protocolos de perda de peso com canetas emagrecedoras e exames.',
    training: 'Foco em saúde metabólica e longevidade. Combate o desânimo com metas realistas.',
    icon: BarChart3,
    status: 'active'
  },
  {
    id: 've9',
    name: 'Consultor de Varizes a Laser',
    role: 'Vendas Cirurgia Vascular',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende tratamentos de varizes com técnicas minimamente invasivas (CLaCS).',
    training: 'Foco em estética das pernas e saúde circulatória. Explica o conforto do laser vs cirurgia.',
    icon: Activity,
    status: 'active'
  },
  {
    id: 've10',
    name: 'Especialista em Ginecologia Regenerativa',
    role: 'Vendas Saúde Íntima',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende rejuvenescimento íntimo, laser vaginal e cirurgias estéticas íntimas.',
    training: 'Abordagem ética e discreta. Foco na recuperação da vida sexual e bem-estar feminino.',
    icon: Sparkles,
    status: 'active'
  },
  {
    id: 've11',
    name: 'Consultor de Check-up Executivo',
    role: 'Vendas Medicina Preventiva',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende planos de saúde corporativos premium e check-ups de 1 dia.',
    training: 'Foco em tempo e performance. Persona pragmática direcionada ao público B2B.',
    icon: ShieldCheck,
    status: 'active'
  },
  {
    id: 've12',
    name: 'Especialista em Soroterapias',
    role: 'Vendas Performance/Nutrição',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende protocolos de reposição de vitaminas e detox endovenoso.',
    training: 'Persona enérgica. Foca nos benefícios imediatos de disposição e imunidade.',
    icon: Zap,
    status: 'active'
  },
  {
    id: 've13',
    name: 'Consultor de Reabilitação Esportiva',
    role: 'Vendas Fisio/Ortopedia',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende pacotes de recuperação para atletas e pacientes com lesões crônicas.',
    training: 'Foco no retorno ao esporte. Explica tecnologias de ondas de choque e crioterapia.',
    icon: Activity,
    status: 'active'
  },
  {
    id: 've14',
    name: 'Especialista em Alergia e Imunoterapia',
    role: 'Vendas Alergologia',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Converte pacientes para protocolos de vacinas e dessensibilização.',
    training: 'Vende a "cura" e o fim das crises alérgicas. Foco em qualidade de vida familiar.',
    icon: ShieldCheck,
    status: 'active'
  },
  {
    id: 've15',
    name: 'Consultor de Longevidade (Modulação)',
    role: 'Vendas Medicina do Estilo de Vida',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende protocolos de otimização hormonal e medicina anti-idade.',
    training: 'Focado em biomarcadores de juventude. Vende vitalidade para os 40, 50 e 60+ anos.',
    icon: BrainCircuit,
    status: 'active'
  },
  {
    id: 've16',
    name: 'Avaliador de Rinoplastia',
    role: 'Vendas Cirurgia da Face',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Qualifica leads que buscam correção estética e funcional do nariz.',
    training: 'Persona perfeccionista. Explica simulações 3D e o impacto da harmonia nasal no rosto.',
    icon: Search,
    status: 'active'
  },
  {
    id: 've17',
    name: 'Consultor de Medicina do Sono',
    role: 'Vendas Sono/CPAP',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende tratamentos para ronco, apneia e insônia crônica.',
    training: 'Vende energia matinal. Explica riscos cardiovasculares da má qualidade do sono.',
    icon: Moon,
    status: 'active'
  },
  {
    id: 've18',
    name: 'Especialista em Psicoterapia Premium',
    role: 'Vendas Saúde Mental',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Focado em converter pacotes de terapia para executivos e casais.',
    training: 'Empatia extrema. Foca em ferramentas práticas e retorno sobre o investimento pessoal.',
    icon: BrainCircuit,
    status: 'active'
  },
  {
    id: 've19',
    name: 'Consultor de Oncologia Personalizada',
    role: 'Vendas Medicina de Precisão',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Fechamento de exames genéticos e planos de acompanhamento oncológico.',
    training: 'Persona resiliente e esperançosa. Explica tecnologias de mapeamento genético.',
    icon: ShieldCheck,
    status: 'active'
  },
  {
    id: 've20',
    name: 'Avaliador de Lentes de Contato Dental',
    role: 'Vendas Odontologia Estética',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende transformações totais do sorriso com facetas e lentes.',
    training: 'Foco em status e brilho. Persona refinada que entende de desejo e aprovação social.',
    icon: DollarSign,
    status: 'active'
  },
  {
    id: 've21',
    name: 'Consultor de Bioestimuladores Corporais',
    role: 'Vendas Dermatologia Estética',
    type: 'vendas_especialidade',
    category: 'especialidade',
    description: 'Vende protocolos de tratamento para flacidez e celulite em coxas e glúteos.',
    training: 'Foco no verão e autoconfiança de biquíni. Explica produção de colágeno natural.',
    icon: Sparkles,
    status: 'active'
  },

  // --- SUPORTE E CONVERSÃO GERAL ---
  {
    id: 'sc1',
    name: 'Triagem Inteligente FlowUp',
    role: 'Qualificador de Leads',
    type: 'suporte_conversao',
    category: 'comercial',
    description: 'Analisa o perfil financeiro e urgência de cada lead em segundos.',
    training: 'Persona comercial ágil. Filtra curiosos e prioriza agendamentos imediatos.',
    icon: Sparkles,
    status: 'active'
  },
  {
    id: 'sc2',
    name: 'Recuperador de Orçamentos',
    role: 'Pós-Venda Comercial',
    type: 'suporte_conversao',
    category: 'comercial',
    description: 'Reengaja orçamentos pendentes com gatilhos de escassez.',
    training: 'Argumentação sobre valor vs preço. Domina técnicas de "downsell" se necessário.',
    icon: TrendingUp,
    status: 'active'
  },
  {
    id: 'sc3',
    name: 'Reativador de Inativos',
    role: 'Gestor de LTV',
    type: 'suporte_conversao',
    category: 'comercial',
    description: 'Busca pacientes que não voltam há mais de 1 ano para novos procedimentos.',
    training: 'Persona nostálgica e atenciosa. Oferece benefícios exclusivos para retorno.',
    icon: Users,
    status: 'active'
  },
  {
    id: 'sc4',
    name: 'Analisador de Objeções',
    role: 'Suporte à Conversão',
    type: 'suporte_conversao',
    category: 'comercial',
    description: 'Identifica padrões de perda de vendas (preço, medo, logística).',
    training: 'Analista de dados. Sugere novos scripts de venda baseados nos motivos de recusa.',
    icon: BarChart3,
    status: 'active'
  },

  // --- ROTINAS E ATIVIDADES CLÍNICAS ---
  {
    id: 'rc1',
    name: 'Dr. Resumo de Prontuário',
    role: 'Apoio Médico',
    type: 'rotina_clinica',
    category: 'clinico',
    description: 'Sintetiza históricos longos para otimizar o tempo de consulta.',
    training: 'Focado em diagnósticos anteriores, alergias e queixas recorrentes.',
    icon: Stethoscope,
    status: 'active'
  },
  {
    id: 'rc2',
    name: 'Assistente de Anamnese Digital',
    role: 'Coletor de Dados',
    type: 'rotina_clinica',
    category: 'clinico',
    description: 'Realiza a pré-consulta via chat coletando queixa familiar e principal.',
    training: 'Persona empática. Estrutura os dados para o prontuário de forma organizada.',
    icon: MessageSquare,
    status: 'active'
  },
  {
    id: 'rc3',
    name: 'Anjo do Pós-Cuidado',
    role: 'Monitoramento Remoto',
    type: 'rotina_clinica',
    category: 'paciente',
    description: 'Monitora recuperação cirúrgica 24/7 com alertas de intercorrência.',
    training: 'Protocolos de segurança. Detecta palavras-chave como "dor insuportável" ou "febre".',
    icon: Bell,
    status: 'active'
  },
  {
    id: 'rc4',
    name: 'Auditor de Fotos Técnicas',
    role: 'Gestor de Evolução',
    type: 'rotina_clinica',
    category: 'clinico',
    description: 'Garante que fotos de Antes e Depois sigam o padrão de angulação clínica.',
    training: 'Visão computacional básica para simetria e iluminação.',
    icon: Search,
    status: 'active'
  },
  {
    id: 'rc5',
    name: 'Guardião LGPD e Compliance',
    role: 'Segurança de Dados',
    type: 'rotina_clinica',
    category: 'administrativo',
    description: 'Audita termos de consentimento e guarda de imagens sensíveis.',
    training: 'Compliance em saúde. Alerta sobre falta de assinaturas em procedimentos críticos.',
    icon: ShieldCheck,
    status: 'active'
  }
];

const AgentCard = ({ agent }: { agent: AIAgent, key?: string }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 group"
  >
    <div className="flex items-center justify-between">
      <div className={`p-3 rounded-2xl ${
        agent.category === 'comercial' ? 'bg-blue-50 text-blue-600' :
        agent.category === 'clinico' ? 'bg-emerald-50 text-emerald-600' :
        agent.category === 'administrativo' ? 'bg-amber-50 text-amber-600' :
        agent.category === 'marketing' ? 'bg-purple-50 text-purple-600' :
        agent.category === 'especialidade' ? 'bg-indigo-50 text-indigo-600' :
        'bg-slate-50 text-slate-600'
      }`}>
        <agent.icon className="w-6 h-6" />
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
        agent.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'
      }`}>
        {agent.status === 'active' ? 'Ativo' : agent.status === 'learning' ? 'Treinando' : 'Inativo'}
      </span>
    </div>

    <div className="flex flex-col gap-1">
      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
        {agent.name}
      </h3>
      <p className="text-xs font-semibold text-slate-400">{agent.role}</p>
    </div>

    <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">
      {agent.description}
    </p>

    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
      <button className="text-[10px] font-bold text-blue-600 uppercase hover:underline">Ajustar Treinamento</button>
      <button className="p-2 hover:bg-blue-50 rounded-lg text-blue-400 group-hover:text-blue-600 transition-colors">
          <ChevronRight className="w-4 h-4" />
      </button>
    </div>

    <div className="mt-2 hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="p-3 bg-slate-50 rounded-xl">
        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Estratégia de Treinamento</p>
        <p className="text-[10px] text-slate-600 italic leading-snug">"{agent.training}"</p>
      </div>
    </div>
  </motion.div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
    <span className="font-medium">{label}</span>
  </button>
);

const Patient360 = ({ patient, onBack }: { patient: Patient, onBack: () => void }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showSignConfirm, setShowSignConfirm] = useState(false);

  const fetchRecords = () => {
    fetch(`/api/patients/${patient.id}/records`)
      .then(res => res.json())
      .then(data => setRecords(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchRecords();
  }, [patient.id]);

  const handleSign = async () => {
    if (!selectedRecord) return;
    
    try {
      const response = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedRecord,
          locked: 1,
          signed_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setShowSignConfirm(false);
        setSelectedRecord(null);
        fetchRecords();
      }
    } catch (error) {
      console.error('Failed to sign record:', error);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
          <TrendingUp className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
            {patient.full_name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{patient.full_name}</h2>
            <p className="text-sm text-slate-500">Ficha 360 • {patient.document_number || 'Sem CPF'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900">Histórico Clínico</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova Evolução
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {records.map((record) => (
                <div key={record.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                          {record.entry_type === 'evolution' ? 'Evolução Clínica' : 'Avaliação'}
                        </span>
                        {record.locked === 1 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded flex items-center gap-1">
                            Assinado
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900">Dr(a). {record.professional_name || 'Profissional'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{new Date(record.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedRecord(record)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      {record.locked === 1 ? 'Visualizar' : 'Visualizar/Editar'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {record.content}
                  </p>
                </div>
              ))}
              {records.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  Nenhum registro clínico encontrado para este paciente.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Informações</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</span>
                <p className="text-sm font-bold text-slate-900">{patient.phone}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">E-mail</span>
                <p className="text-sm font-bold text-slate-900">{patient.email || '-'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Fonte</span>
                <p className="text-sm font-bold text-slate-900">{patient.source}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Visualização */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-bold text-slate-900">Detalhes do Registro</h3>
               <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-full">
                 <Plus className="w-5 h-5 rotate-45 text-slate-400" />
               </button>
            </div>
            
            <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl">
               <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                 <span>Profissional: {selectedRecord.professional_name}</span>
                 <div className="flex items-center gap-3">
                   {selectedRecord.locked === 1 && (
                     <span className="text-emerald-600 font-black">DOCUMENTO ASSINADO</span>
                   )}
                   <span>{new Date(selectedRecord.created_at).toLocaleString('pt-BR')}</span>
                 </div>
               </div>
            </div>

            <textarea 
              disabled={selectedRecord.locked === 1}
              className={`flex-1 w-full p-4 rounded-2xl border-none outline-none text-slate-700 leading-relaxed min-h-[200px] ${
                selectedRecord.locked === 1 ? 'bg-slate-100/50 cursor-not-allowed text-slate-400' : 'bg-slate-50'
              }`}
              defaultValue={selectedRecord.content}
            ></textarea>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 rounded-xl text-slate-500 font-bold"
              >
                Fechar
              </button>
              {selectedRecord.locked !== 1 && (
                <>
                  <button 
                    onClick={() => setShowSignConfirm(true)}
                    className="px-6 py-2 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-200 transition-colors"
                  >
                    Assinar Digitalmente
                  </button>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">
                    Salvar Alterações
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmação de Assinatura */}
      {showSignConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 flex flex-col gap-6 text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold text-slate-900">Confirmar Assinatura</h3>
              <p className="text-sm text-slate-500">
                Tem certeza que deseja assinar e bloquear este prontuário? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleSign}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100"
              >
                Sim, Assinar Documento
              </button>
              <button 
                onClick={() => setShowSignConfirm(false)}
                className="w-full py-3 text-slate-400 font-bold"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// --- Main Components ---

const StatCard = ({ label, value, icon: Icon, color, trend }: { label: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4"
  >
    <div className="flex items-center justify-between">
      <div className={`p-3 rounded-2xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-600 rounded-lg">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
  </motion.div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState({ full_name: '', phone: '', email: '', date: '', time: '' });
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({ full_name: '', phone: '', email: '', source: 'Manual' });
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ full_name: '', phone: '', email: '', source: 'Manual' });
  const [formErrors, setFormErrors] = useState({ full_name: '', phone: '', email: '', date: '', time: '' });

  const fetchPatients = () => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => setPatients(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);

    fetchPatients();
  }, []);

  const resetForm = () => {
    setNewPatientData({ full_name: '', phone: '', email: '', source: 'Manual' });
    setNewLeadData({ full_name: '', phone: '', email: '', source: 'Manual' });
    setNewAppointmentData({ full_name: '', phone: '', email: '', date: '', time: '' });
    setFormErrors({ full_name: '', phone: '', email: '', date: '', time: '' });
  };

  const validateForm = (data: any) => {
    const errors = {
      full_name: !data.full_name ? 'Nome é obrigatório' : '',
      phone: validatePhone(data.phone) || '',
      email: !validateEmail(data.email) ? 'E-mail inválido' : '',
      date: data.date !== undefined && !data.date ? 'Data é obrigatória' : '',
      time: data.time !== undefined && !data.time ? 'Hora é obrigatória' : '',
    };
    setFormErrors(errors);
    return !errors.full_name && !errors.phone && !errors.email && !errors.date && !errors.time;
  };

  const handleSavePatient = async () => {
    if (!validateForm(newPatientData)) return;

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatientData),
      });

      if (response.ok) {
        setIsAddingPatient(false);
        resetForm();
        fetchPatients();
      }
    } catch (error) {
      console.error('Failed to save patient:', error);
    }
  };

  const handleSaveLead = async () => {
    if (!validateForm(newLeadData)) return;

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLeadData, status: 'Lead' }),
      });

      if (response.ok) {
        setIsAddingLead(false);
        resetForm();
        fetchPatients();
      }
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  };

  const handleSaveAppointment = async () => {
    if (!validateForm(newAppointmentData)) return;

    // Simulate saving appointment
    setIsAddingAppointment(false);
    resetForm();
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            N
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nexus <span className="text-blue-600">360</span></h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Users} label="Pacientes" active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} />
          <SidebarItem icon={TrendingUp} label="CRM" active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} />
          <SidebarItem icon={Calendar} label="Agenda" active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} />
          <SidebarItem icon={MessageSquare} label="Atendimento" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <SidebarItem icon={BrainCircuit} label="Agentes IA" active={activeTab === 'ai_agents'} onClick={() => setActiveTab('ai_agents')} />
          <SidebarItem icon={FileText} label="Documentos" active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} />
          <div className="mt-8 mb-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Configuração</div>
          <SidebarItem icon={Settings} label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
              <UserCircle className="w-full h-full p-1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">Dr. Ricardo Nexus</p>
              <p className="text-xs text-slate-500 truncate">Sócio Diretor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-xl w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar paciente, lead ou consulta..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-600"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={async () => {
                await fetch('/api/mock/populate', { method: 'POST' });
                window.location.reload();
              }}
              className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider hidden md:block"
            >
              Seed Demo
            </button>
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-100">
              <Plus className="w-4 h-4" />
              <span>Novo Registro</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900">Bom dia, Ricardo 👋</h2>
                <p className="text-slate-500">Aqui está o resumo da sua operação hoje.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  label="Leads Novos" 
                  value={stats?.leads.count ?? 0} 
                  icon={TrendingUp} 
                  color="bg-blue-500" 
                  trend="+12%"
                />
                <StatCard 
                  label="Consultas Hoje" 
                  value={stats?.appointments.count ?? 0} 
                  icon={Calendar} 
                  color="bg-purple-500" 
                />
                <StatCard 
                  label="Pacientes Totais" 
                  value={stats?.patients.count ?? 0} 
                  icon={Users} 
                  color="bg-emerald-500" 
                />
                <StatCard 
                  label="Faturamento Mes" 
                  value={`R$ ${(stats?.revenue.total ?? 0).toLocaleString()}`} 
                  icon={DollarSign} 
                  color="bg-amber-500" 
                  trend="+5%"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Activity Column */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Comercial</h3>
                    <div className="flex items-center gap-4 text-center">
                       {/* Placeholder for visual CRM flow */}
                       {['Novo', 'Qualificação', 'Agendado', 'Fechado'].map((step, i) => (
                         <div key={step} className="flex-1 flex flex-col items-center gap-2">
                           <div className={`w-full h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-slate-100'}`} />
                           <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{step}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900">Agenda do Dia</h3>
                      <button className="text-sm font-bold text-blue-600 hover:underline">Ver tudo</button>
                    </div>
                    <div className="flex flex-col gap-4">
                      {/* Empty state or items */}
                      <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Calendar className="w-8 h-8 opacity-20" />
                        <p className="text-sm font-medium">Nenhuma consulta agendada para hoje.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Column */}
                <div className="flex flex-col gap-8">
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Novos Leads</h3>
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-slate-400 text-center py-4">Sem leads novos no momento.</p>
                    </div>
                  </div>

                  <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col gap-4 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-1">Nexus AI Coach</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">Sua taxa de conversão em harmonização facial subiu 15% após mudar o script de atendimento.</p>
                    </div>
                    <button className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-4 py-2 rounded-xl text-sm font-bold w-fit hover:bg-white/30 transition-all">
                      Ver insights
                    </button>
                    <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            selectedPatient ? (
              <Patient360 patient={selectedPatient} onBack={() => setSelectedPatientId(null)} />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold text-slate-900">Pacientes</h2>
                    <p className="text-slate-500">Gerencie a base completa de pacientes da clínica.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingPatient(true)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                  >
                    <Plus className="w-5 h-5" />
                    Novo Paciente
                  </button>
                </div>

                {/* Modal Novo Paciente */}
                {isAddingPatient && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 flex flex-col gap-6"
                    >
                      <div className="flex items-center justify-between">
                         <h3 className="text-xl font-bold text-slate-900">Cadastrar Novo Paciente</h3>
                         <button onClick={() => setIsAddingPatient(false)} className="p-2 hover:bg-slate-100 rounded-full">
                           <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                         </button>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Nome Completo</label>
                          <input 
                            type="text"
                            value={newPatientData.full_name}
                            onChange={(e) => setNewPatientData({ ...newPatientData, full_name: e.target.value })}
                            placeholder="Ex: João da Silva"
                            className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.full_name ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                          />
                          {formErrors.full_name && <span className="text-[10px] text-red-500 font-bold">{formErrors.full_name}</span>}
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Telefone / WhatsApp</label>
                          <input 
                            type="text"
                            value={newPatientData.phone}
                            onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                            placeholder="Ex: 48 99999-9999"
                            className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.phone ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                          />
                          {formErrors.phone && <span className="text-[10px] text-red-500 font-bold">{formErrors.phone}</span>}
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">E-mail</label>
                          <input 
                            type="email"
                            value={newPatientData.email}
                            onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                            placeholder="Ex: joao@email.com"
                            className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.email ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                          />
                          {formErrors.email && <span className="text-[10px] text-red-500 font-bold">{formErrors.email}</span>}
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Fonte</label>
                          <select 
                            value={newPatientData.source}
                            onChange={(e) => setNewPatientData({ ...newPatientData, source: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="Manual">Manual</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Indicação">Indicação</option>
                            <option value="Google">Google</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-4">
                        <button 
                          onClick={() => setIsAddingPatient(false)}
                          className="px-6 py-2 rounded-xl text-slate-500 font-bold"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleSavePatient}
                          className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                        >
                          Salvar Paciente
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Fonte</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cadastro</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                {patient.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{patient.full_name}</p>
                                <p className="text-xs text-slate-500">{patient.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm text-slate-600 truncate max-w-[200px]">{patient.email || '-'}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                              {patient.source || 'Manual'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-xs font-bold px-2 py-1 bg-green-50 text-green-600 rounded-lg">Ativo</span>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm text-slate-600 font-medium">
                              {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            <button 
                              onClick={() => setSelectedPatientId(patient.id)}
                              className="text-blue-600 font-bold text-sm hover:underline"
                            >
                              Ficha 360
                            </button>
                          </td>
                        </tr>
                      ))}
                      {patients.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">
                            Nenhum paciente encontrado. Clique em "Seed Demo" para carregar dados de teste.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {activeTab === 'crm' && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold text-slate-900">Pipeline Comercial</h2>
                  <p className="text-slate-500">Acompanhe a jornada dos seus leads até o fechamento.</p>
                </div>
                <div className="flex gap-3">
                   <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm">Filtros</button>
                   <button 
                     onClick={() => setIsAddingLead(true)}
                     className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm"
                   >
                     Novo Lead
                   </button>
                </div>
              </div>

              {/* Modal Novo Lead */}
              {isAddingLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 flex flex-col gap-6"
                  >
                    <div className="flex items-center justify-between">
                       <h3 className="text-xl font-bold text-slate-900">Cadastrar Novo Lead</h3>
                       <button onClick={() => setIsAddingLead(false)} className="p-2 hover:bg-slate-100 rounded-full">
                         <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                       </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Nome do Lead</label>
                        <input 
                          type="text"
                          value={newLeadData.full_name}
                          onChange={(e) => setNewLeadData({ ...newLeadData, full_name: e.target.value })}
                          placeholder="Ex: Maria Oliveira"
                          className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.full_name ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                        />
                        {formErrors.full_name && <span className="text-[10px] text-red-500 font-bold">{formErrors.full_name}</span>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Telefone / WhatsApp</label>
                        <input 
                          type="text"
                          value={newLeadData.phone}
                          onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                          placeholder="Ex: 11 98888-7777"
                          className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.phone ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                        />
                        {formErrors.phone && <span className="text-[10px] text-red-500 font-bold">{formErrors.phone}</span>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">E-mail</label>
                        <input 
                          type="email"
                          value={newLeadData.email}
                          onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                          placeholder="Ex: maria@email.com"
                          className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.email ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                        />
                        {formErrors.email && <span className="text-[10px] text-red-500 font-bold">{formErrors.email}</span>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Origem do Lead</label>
                        <select 
                          value={newLeadData.source}
                          onChange={(e) => setNewLeadData({ ...newLeadData, source: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="Instagram">Instagram</option>
                          <option value="Google Ads">Google Ads</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Site">Site</option>
                          <option value="Manual">Manual</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <button 
                        onClick={() => setIsAddingLead(false)}
                        className="px-6 py-2 rounded-xl text-slate-500 font-bold"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveLead}
                        className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                      >
                        Salvar Lead
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                {[
                  { label: 'Novos', color: 'bg-blue-500', count: 1 },
                  { label: 'Qualificação', color: 'bg-amber-500', count: 0 },
                  { label: 'Agendados', color: 'bg-purple-500', count: 0 },
                  { label: 'Fechados', color: 'bg-emerald-500', count: 0 }
                ].map((column) => (
                  <div key={column.label} className="bg-slate-100/50 rounded-3xl p-4 flex flex-col gap-4 border border-slate-200/50">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${column.color}`} />
                         {column.label}
                       </h4>
                       <span className="text-xs font-bold text-slate-400">{column.count}</span>
                    </div>
                    
                    {column.count > 0 ? (
                      <motion.div 
                        whileHover={{ y: -2 }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 cursor-pointer"
                      >
                         <p className="text-sm font-bold text-slate-900">Maria Oliveira</p>
                         <div className="flex gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">Botox</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md">Instagram</span>
                         </div>
                         <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span>Há 2 horas</span>
                            <MessageSquare className="w-3 h-3" />
                         </div>
                      </motion.div>
                    ) : (
                      <div className="py-8 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
                        <Plus className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="flex flex-col gap-8">
               <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold text-slate-900">Agenda Clínica</h2>
                  <p className="text-slate-500">Gestão de horários e salas da unidade.</p>
                </div>
                <div className="flex gap-2 bg-white border border-slate-200 p-1 rounded-xl">
                   <button className="px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-900">Dia</button>
                   <button className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-400 underline-offset-4 hover:bg-slate-50">Semana</button>
                   <button className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-400 underline-offset-4 hover:bg-slate-50">Mês</button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 min-h-[400px] flex flex-col items-center justify-center text-slate-400 gap-4">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 opacity-20" />
                 </div>
                 <div className="text-center">
                   <p className="text-slate-900 font-bold">Nenhum evento para hoje</p>
                   <p className="text-sm">Clique em um horário para agendar uma consulta.</p>
                 </div>
                 <button 
                   onClick={() => setIsAddingAppointment(true)}
                   className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                 >
                   Agendar Agora
                 </button>
               </div>

               {/* Modal Novo Agendamento */}
               {isAddingAppointment && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                   <motion.div 
                     initial={{ scale: 0.95, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 flex flex-col gap-6"
                   >
                     <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Agendar Nova Consulta</h3>
                        <button onClick={() => setIsAddingAppointment(false)} className="p-2 hover:bg-slate-100 rounded-full">
                          <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                        </button>
                     </div>

                     <div className="flex flex-col gap-4">
                       <div className="flex flex-col gap-1">
                         <label className="text-xs font-bold text-slate-400 uppercase">Nome do Paciente</label>
                         <input 
                           type="text"
                           value={newAppointmentData.full_name}
                           onChange={(e) => setNewAppointmentData({ ...newAppointmentData, full_name: e.target.value })}
                           placeholder="Ex: João da Silva"
                           className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.full_name ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                         />
                         {formErrors.full_name && <span className="text-[10px] text-red-500 font-bold">{formErrors.full_name}</span>}
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col gap-1">
                           <label className="text-xs font-bold text-slate-400 uppercase">WhatsApp</label>
                           <input 
                             type="text"
                             value={newAppointmentData.phone}
                             onChange={(e) => setNewAppointmentData({ ...newAppointmentData, phone: e.target.value })}
                             placeholder="Ex: 48 99999-0000"
                             className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.phone ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                           />
                           {formErrors.phone && <span className="text-[10px] text-red-500 font-bold">{formErrors.phone}</span>}
                         </div>
                         <div className="flex flex-col gap-1">
                           <label className="text-xs font-bold text-slate-400 uppercase">E-mail</label>
                           <input 
                             type="email"
                             value={newAppointmentData.email}
                             onChange={(e) => setNewAppointmentData({ ...newAppointmentData, email: e.target.value })}
                             placeholder="Ex: joao@email.com"
                             className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.email ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                           />
                           {formErrors.email && <span className="text-[10px] text-red-500 font-bold">{formErrors.email}</span>}
                         </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col gap-1">
                           <label className="text-xs font-bold text-slate-400 uppercase">Data</label>
                           <input 
                             type="date"
                             value={newAppointmentData.date}
                             onChange={(e) => setNewAppointmentData({ ...newAppointmentData, date: e.target.value })}
                             className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.date ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                           />
                           {formErrors.date && <span className="text-[10px] text-red-500 font-bold">{formErrors.date}</span>}
                         </div>
                         <div className="flex flex-col gap-1">
                           <label className="text-xs font-bold text-slate-400 uppercase">Hora</label>
                           <input 
                             type="time"
                             value={newAppointmentData.time}
                             onChange={(e) => setNewAppointmentData({ ...newAppointmentData, time: e.target.value })}
                             className={`w-full px-4 py-3 bg-slate-50 rounded-xl border ${formErrors.time ? 'border-red-300' : 'border-slate-100'} outline-none focus:ring-2 focus:ring-blue-500/20`}
                           />
                           {formErrors.time && <span className="text-[10px] text-red-500 font-bold">{formErrors.time}</span>}
                         </div>
                       </div>
                     </div>

                     <div className="flex justify-end gap-3 mt-4">
                       <button 
                         onClick={() => setIsAddingAppointment(false)}
                         className="px-6 py-2 rounded-xl text-slate-500 font-bold"
                       >
                         Cancelar
                       </button>
                       <button 
                         onClick={handleSaveAppointment}
                         className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                       >
                         Confirmar Agendamento
                       </button>
                     </div>
                   </motion.div>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'ai_agents' && (
            <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold text-slate-900">Nexus AI Agents 🧠</h2>
                  <p className="text-slate-500">Inteligência Artificial especializada por área da saúde.</p>
                </div>
              </div>

               <div className="flex flex-col gap-12">
                 {/* Seção 1: Vendas por Especialidade */}
                 <div className="flex flex-col gap-6">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                       <Stethoscope className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold text-slate-900">Vendas por Especialidade</h3>
                       <p className="text-sm text-slate-400 font-medium">Agentes focados em procedimentos específicos das maiores áreas da saúde.</p>
                     </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {AGENTS.filter(a => a.type === 'vendas_especialidade').map((agent) => (
                       <AgentCard key={agent.id} agent={agent} />
                     ))}
                   </div>
                 </div>

                 <div className="h-px bg-slate-100" />

                 {/* Seção 2: Suporte e Conversão */}
                 <div className="flex flex-col gap-6">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-100">
                       <TrendingUp className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold text-slate-900">Suporte e Conversão Geral</h3>
                       <p className="text-sm text-slate-400 font-medium">Triagem, reativação e recuperação de orçamentos pendentes.</p>
                     </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {AGENTS.filter(a => a.type === 'suporte_conversao').map((agent) => (
                       <AgentCard key={agent.id} agent={agent} />
                     ))}
                   </div>
                 </div>

                 <div className="h-px bg-slate-100" />

                 {/* Seção 3: Rotinas e Atividades */}
                 <div className="flex flex-col gap-6">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-100">
                       <ShieldCheck className="w-5 h-5" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold text-slate-900">Rotinas e Atividades Clínicas</h3>
                       <p className="text-sm text-slate-400 font-medium">Automação de prontuário, compliance e monitoramento pós-cuidado.</p>
                     </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {AGENTS.filter(a => a.type === 'rotina_clinica').map((agent) => (
                       <AgentCard key={agent.id} agent={agent} />
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
