import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Church, 
  UserPlus, 
  FileText, 
  LogOut, 
  Phone, 
  MapPin, 
  User, 
  Download,
  Search,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Baby,
  AlertCircle,
  Trash2,
  Pencil,
  X,
  ChevronRight,
  Sparkles,
  Users,
  RefreshCw,
  Key,
  Share2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase';
import { visitorService } from './services/visitorService';
import { userService, UserProfile } from './services/userService';
import { Visitor } from './types';
import { User as SupabaseUser } from '@supabase/supabase-js';

const PDFReportGenerator = (visitors: Visitor[], category: string, period: string) => {
  const doc = new jsPDF();
  
  const categoryLabel = category === 'todas' ? 'Toda Equipe' : category === 'homens' ? 'Homens' : category === 'mulheres' ? 'Mulheres' : 'Jovens';
  
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  let periodLabel = 'Todos';
  if (period === 'weekly') periodLabel = 'Últimos 7 dias';
  else if (period === 'monthly') periodLabel = 'Últimos 30 dias';
  else if (period.startsWith('custom:')) {
    const [, month, year] = period.split(':');
    const mIndex = parseInt(month, 10) - 1;
    periodLabel = `${months[mIndex] || month} de ${year}`;
  }

  doc.setFontSize(20);
  doc.text(`Relatório: ${categoryLabel}`, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Período: ${periodLabel} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
  
  const tableData = visitors.map((v, i) => {
    let dateStr = '-';
    try {
      if (v.createdAt) {
        if (typeof v.createdAt === 'object' && v.createdAt.seconds) {
          dateStr = new Date(v.createdAt.seconds * 1000).toLocaleDateString('pt-BR');
        } else {
          dateStr = new Date(v.createdAt).toLocaleDateString('pt-BR');
        }
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }

    const visitorAge = v.age || (v.birthDate ? calculateAge(v.birthDate) : '-');

    return [
      i + 1,
      v.name,
      v.phone,
      v.category ? v.category.charAt(0).toUpperCase() + v.category.slice(1) : '-',
      visitorAge,
      v.gender || '-',
      v.birthDate || '-',
      v.participatesInCell === 'sim' ? `Sim ${v.cellLeader ? '(' + v.cellLeader + ')' : ''}` : v.participatesInCell === 'nao' ? `Não ${v.invitedBy ? '(Conv: ' + v.invitedBy + ')' : ''}` : '-',
      v.isMarriedOrLivesTogether === 'sim' ? 'Sim' : v.isMarriedOrLivesTogether === 'nao' ? 'Não' : '-',
      v.prayerRequest
        ? `${v.prayerRequest}${v.observation ? ' \n(Obs: ' + v.observation + ')' : ''}`
        : (v.observation ? `Obs: ${v.observation}` : '-'),
      v.address,
      dateStr
    ];
  });
  
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Nome', 'Telefone', 'Grupo', 'Idade', 'Sexo', 'Nasc.', 'Célula/Convidado', 'Mora Junto', 'Pedido Oração / Obs.', 'Endereço', 'Data de Reg.']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] },
    styles: { fontSize: 7 }
  });
  
  doc.save(`relatorio-${category}-${period}.pdf`);
};

const calculateAge = (birthDate: string) => {
  if (!birthDate || !birthDate.includes('/')) return '-';
  const parts = birthDate.split('/');
  if (parts.length !== 3) return '-';
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year || year < 1000) return '-';
  
  const today = new Date();
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age.toString() : '-';
};

const TXTReportGenerator = (visitors: Visitor[], category: string, period: string) => {
  const separator = "================================================================================\n";
  const lineSeparator = "--------------------------------------------------------------------------------\n";
  
  let content = separator;
  content += `RELATÓRIO DE VISITANTES - IP IPCC\n`;

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  let periodLabel = 'Todos';
  if (period === 'weekly') periodLabel = 'Últimos 7 dias';
  else if (period === 'monthly') periodLabel = 'Últimos 30 dias';
  else if (period.startsWith('custom:')) {
    const [, month, year] = period.split(':');
    const mIndex = parseInt(month, 10) - 1;
    periodLabel = `${months[mIndex] || month} de ${year}`;
  }

  content += `Categoria: ${category.toUpperCase()} | Período: ${periodLabel}\n`;
  content += `Total de Visitantes: ${visitors.length}\n`;
  content += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
  content += separator + "\n";

  visitors.forEach((v, index) => {
    let dateStr = 'Não informada';
    try {
      if (v.createdAt) {
        if (typeof v.createdAt === 'object' && v.createdAt.seconds) {
          dateStr = new Date(v.createdAt.seconds * 1000).toLocaleDateString('pt-BR');
        } else {
          dateStr = new Date(v.createdAt).toLocaleDateString('pt-BR');
        }
      }
    } catch (e) {
      console.error(e);
    }

    const ageStr = v.age || (v.birthDate ? calculateAge(v.birthDate) : 'Não inf.');

    content += `${index + 1}. NOME: ${v.name.toUpperCase()}\n`;
    content += `   Telefone: ${v.phone}\n`;
    content += `   Categoria/Grupo: ${v.category || 'Não inf.'}\n`;
    content += `   Idade: ${ageStr} | Gênero: ${v.gender || 'Não inf.'}\n`;
    content += `   Data de Nasc.: ${v.birthDate || 'Não inf.'}\n`;
    content += `   Mora junto / Casado: ${v.isMarriedOrLivesTogether || 'Não inf.'}\n`;
    content += `   Quem convidou: ${v.invitedBy || 'Não inf.'}\n`;
    content += `   Participa de Célula: ${v.participatesInCell === 'sim' ? 'Sim' : 'Não'}${v.cellLeader ? ' (Líder: ' + v.cellLeader + ')' : ''}\n`;
    content += `   Endereço: ${v.address || 'Não inf.'}\n`;
    if (v.prayerRequest) {
      content += `   Pedido de Oração: ${v.prayerRequest}\n`;
    }
    if (v.observation) {
      content += `   Observação: ${v.observation}\n`;
    }
    content += `   Data de Cadastro: ${dateStr}\n`;
    content += lineSeparator + "\n";
  });

  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio-${category}-${period}.txt`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getSharedVisitorData = (): any | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('shared');
    if (!shared) return null;
    const decoded = decodeURIComponent(escape(atob(shared)));
    return JSON.parse(decoded);
  } catch (e) {
    console.error('Error decoding shared visitor data:', e);
    return null;
  }
};

const downloadVisitorTxt = (visitor: any, observation: string) => {
  const dateStr = visitor.createdAt 
    ? new Date(typeof visitor.createdAt === 'object' && visitor.createdAt.seconds ? visitor.createdAt.seconds * 1000 : visitor.createdAt).toLocaleDateString('pt-BR')
    : 'Não informada';

  const categoryName = visitor.category 
    ? visitor.category.charAt(0).toUpperCase() + visitor.category.slice(1)
    : 'Não informada';

  let content = `================================================================================\n`;
  content += `FICHA DE VISITANTE - IGREJA PRESBITERIANA (IP IPCC)\n`;
  content += `================================================================================\n\n`;
  
  content += `INFORMAÇÕES PESSOAIS:\n`;
  content += `---------------------\n`;
  content += `Nome: ${visitor.name.toUpperCase()}\n`;
  content += `Grupo de Interesse: ${categoryName}\n`;
  content += `Telefone: ${visitor.phone}\n`;
  content += `Data de Nascimento: ${visitor.birthDate || 'Não informada'}\n`;
  content += `Gênero: ${visitor.gender || 'Não informado'}\n`;
  content += `Idade aproximada: ${visitor.age || 'Não informada'} anos\n`;
  content += `Estado Civil / Mora Junto: ${visitor.isMarriedOrLivesTogether || 'Não informado'}\n\n`;

  content += `INTEGRAÇÃO & VIDA RELIGIOSA:\n`;
  content += `----------------------------\n`;
  content += `Participa de Célula?: ${visitor.participatesInCell === 'sim' ? 'Sim' : 'Não'}\n`;
  if (visitor.participatesInCell === 'sim' && visitor.cellLeader) {
    content += `Nome do Líder da Célula: ${visitor.cellLeader}\n`;
  }
  content += `Convidado por: ${visitor.invitedBy || 'Chegou voluntariamente / Ninguém'}\n`;
  content += `Endereço Completo: ${visitor.address || 'Não informado'}\n`;
  if (visitor.prayerRequest) {
    content += `Pedido de Oração: "${visitor.prayerRequest}"\n`;
  }
  content += `Data do Cadastro: ${dateStr}\n\n`;

  if (observation) {
    content += `OBSERVAÇÕES EXTRAS:\n`;
    content += `-------------------\n`;
    content += `${observation}\n\n`;
  }

  content += `================================================================================\n`;
  content += `Documento gerado automaticamente em: ${new Date().toLocaleString('pt-BR')}\n`;
  content += `================================================================================\n`;

  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const sanitizedVisitorName = visitor.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  link.setAttribute('download', `ficha_visitante_${sanitizedVisitorName}.txt`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'register' | 'list' | 'users'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Report filter states
  const [reportPeriod, setReportPeriod] = useState<'all' | 'weekly' | 'monthly' | 'custom'>('all');
  const [reportCustomMonth, setReportCustomMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [reportCustomYear, setReportCustomYear] = useState<string>(new Date().getFullYear().toString());
  const [reportCategory, setReportCategory] = useState<'homens' | 'mulheres' | 'jovens' | 'todas'>('homens');
  const [visitorSearchTerm, setVisitorSearchTerm] = useState('');

  // Compartilhamento states
  const [sharingVisitor, setSharingVisitor] = useState<Visitor | null>(null);
  const [sharingObservation, setSharingObservation] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Admin User Management states
  const [adminNewUserEmail, setAdminNewUserEmail] = useState('');
  const [adminNewUserPassword, setAdminNewUserPassword] = useState('');
  const [adminNewUserDisplayName, setAdminNewUserDisplayName] = useState('');
  const [adminNewUserCategory, setAdminNewUserCategory] = useState<'homens' | 'mulheres' | 'jovens' | 'user'>('user');
  const [adminCreateLoading, setAdminCreateLoading] = useState(false);
  const [adminCreateMessage, setAdminCreateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);

  const handleAdminDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir PERMANENTEMENTE o usuário ${email}? Esta ação removerá o acesso dele ao sistema e não pode ser desfeita.`)) {
      return;
    }

    setIsDeletingUser(userId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("Sessão não encontrada.");

      // First delete from auth via our API
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      let result;
      const text = await response.text();
      try {
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Resposta inválida do servidor (${response.status}): ${text.substring(0, 100)}`);
      }

      if (!response.ok && !result.error?.includes("User not found")) {
        throw new Error(result.error || "Erro ao remover conta de acesso.");
      }

      // Then delete the profile from DB
      await userService.deleteProfile(userId);
      
      alert(`Usuário ${email} removido com sucesso.`);
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao excluir usuário.");
    } finally {
      setIsDeletingUser(null);
    }
  };

  const handleAdminDeleteByEmail = async () => {
    const email = window.prompt("Digite o E-MAIL exato que deseja remover do Supabase Auth:");
    if (!email || !email.includes('@')) {
      if (email) alert("E-mail inválido.");
      return;
    }

    if (!window.confirm(`ATENÇÃO: Você está prestes a remover o acesso de ${email} DIRETAMENTE do Supabase. Use isso apenas para contas "presas" que não aparecem na lista. Continuar?`)) {
      return;
    }

    setAdminCreateLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sessão não encontrada.");

      const response = await fetch('/api/admin/delete-user-by-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: email.trim() })
      });

      let result;
      const text = await response.text();
      try {
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Resposta inválida do servidor (${response.status}): ${text.substring(0, 100)}`);
      }

      if (!response.ok) throw new Error(result.error || "Erro ao remover conta.");

      alert(result.message || "Conta removida com sucesso!");
      fetchProfiles();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao excluir usuário.");
    } finally {
      setAdminCreateLoading(false);
    }
  };

  const handleAdminChangePassword = async (userId: string) => {
    const newPassword = window.prompt("Digite a nova senha para este usuário:");
    if (!newPassword || newPassword.length < 6) {
      if (newPassword) alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsChangingPassword(userId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("Sessão não encontrada. Faça login novamente.");

      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, newPassword })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao alterar senha.");

      alert("Senha alterada com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setIsChangingPassword(null);
    }
  };

  const fetchProfiles = async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const data = await userService.getProfiles();
      const safeData = data || [];
      setProfiles(safeData);
      if (user) {
        const myProfile = safeData.find(p => p.id === user.id);
        if (myProfile) setCurrentUserProfile(myProfile);
      }
    } catch (err: any) {
      console.error('Erro detalhado ao buscar perfis:', err);
      const errorMessage = err.message || (err.error_description) || JSON.stringify(err);
      setProfilesError(`Erro de acesso: ${errorMessage}. Verifique se a tabela 'profiles' existe e tem políticas RLS ativas no Supabase.`);
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleAdminCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCreateLoading(true);
    setAdminCreateMessage(null);
    try {
      // Create a temporary client that doesn't persist the session
      // This prevents the admin from being logged out when creating a new user
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      if (editingProfileId) {
        await userService.updateProfile(editingProfileId, {
          display_name: adminNewUserDisplayName,
          admin_category: adminNewUserCategory === 'user' ? null : adminNewUserCategory,
          role: adminNewUserCategory === 'user' ? 'user' : 'admin'
        });
        setAdminCreateMessage({ 
          type: 'success', 
          text: 'Usuário atualizado com sucesso!' 
        });
        setEditingProfileId(null);
      } else {
        const { data, error } = await tempClient.auth.signUp({
          email: adminNewUserEmail,
          password: adminNewUserPassword,
          options: {
            data: {
              display_name: adminNewUserDisplayName,
              admin_category: adminNewUserCategory === 'user' ? null : adminNewUserCategory,
            }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          await userService.upsertProfile({
            id: data.user.id,
            email: adminNewUserEmail,
            display_name: adminNewUserDisplayName,
            admin_category: adminNewUserCategory === 'user' ? null : adminNewUserCategory,
            role: adminNewUserCategory === 'user' ? 'user' : 'admin'
          });
        }

        setAdminCreateMessage({ 
          type: 'success', 
          text: 'Usuário criado com sucesso! Ele já aparece na lista abaixo.' 
        });
      }
      
      fetchProfiles();
      // Reset form
      setAdminNewUserEmail('');
      setAdminNewUserPassword('');
      setAdminNewUserDisplayName('');
      setAdminNewUserCategory('user');
    } catch (error: any) {
      console.error(error);
      setAdminCreateMessage({ type: 'error', text: error.message || 'Erro ao processar usuário.' });
    } finally {
      setAdminCreateLoading(false);
    }
  };

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [userAdminCategory, setUserAdminCategory] = useState<'homens' | 'mulheres' | 'jovens' | null>(null);

  const currentUserAdminCategory = currentUserProfile?.admin_category || (user?.user_metadata?.admin_category as 'homens' | 'mulheres' | 'jovens' | undefined);
  const isUserAdmin = !!currentUserAdminCategory || user?.email === 'adminnovo@gmail.com' || currentUserProfile?.role === 'admin';
  const effectiveAdminCategory = currentUserAdminCategory || (user?.email === 'adminnovo@gmail.com' ? 'todas' : null);

  const isMasterAdmin = user?.email === 'adminnovo@gmail.com';
  const allowedVisitors = (isMasterAdmin || currentUserProfile?.role === 'admin' || effectiveAdminCategory === 'todas')
    ? visitors
    : (effectiveAdminCategory)
      ? visitors.filter(v => v.category === effectiveAdminCategory || v.createdBy === user?.id)
      : visitors.filter(v => v.createdBy === user?.id);

  const displayVisitors = allowedVisitors.filter(v => {
    if (!visitorSearchTerm) return true;
    const term = visitorSearchTerm.toLowerCase();
    return (
      v.name.toLowerCase().includes(term) ||
      v.phone.toLowerCase().includes(term) ||
      (v.invitedBy && v.invitedBy.toLowerCase().includes(term))
    );
  });

  // Visitor form states
  const [showCategoryStep, setShowCategoryStep] = useState(true);
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    address: string;
    age: string;
    gender: string;
    birthDate: string;
    participatesInCell: string;
    cellLeader: string;
    category?: 'homens' | 'mulheres' | 'jovens';
    isMarriedOrLivesTogether: string;
    prayerRequest: string;
    invitedBy: string;
    observation: string;
  }>({
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: '',
    birthDate: '',
    participatesInCell: '',
    cellLeader: '',
    category: undefined,
    isMarriedOrLivesTogether: '',
    prayerRequest: '',
    invitedBy: '',
    observation: ''
  });

  useEffect(() => {
    if (view === 'users' && isUserAdmin) {
      fetchProfiles();
    }
  }, [view, isUserAdmin]);

  useEffect(() => {
    // Check active sessions and sets up the observer gracefully
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        visitorService.testConnection();
        fetchVisitors();
        fetchProfiles();
      }
    }).catch(err => {
      console.error('Erro ao buscar sessão inicial:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isLoggingIn = !user && session?.user;
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        visitorService.testConnection();
        fetchVisitors();
        fetchProfiles();

        // Salva/Sincroniza perfil apenas em eventos de login novos ou atualização cadastral
        // Isso evita overhead/loop de escritas desnecessárias a cada refresh de token silencioso
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const isMasterAdmin = session.user.email === 'adminnovo@gmail.com';
          let displayName = session.user.user_metadata?.display_name || 'Usuário';
          if (isMasterAdmin) {
            displayName = 'Admin Master';
          }

          try {
            await userService.upsertProfile({
              id: session.user.id,
              email: session.user.email || '',
              display_name: displayName,
              admin_category: session.user.user_metadata?.admin_category || null,
              role: (session.user.user_metadata?.admin_category || isMasterAdmin) ? 'admin' : 'user'
            });
            fetchProfiles();
          } catch (err) {
            console.error('Erro silencioso ao auto-salvar perfil:', err);
          }
        }

        // Redireciona para home apenas no login ativo, impedindo que resets ocorram em refreshes de token em segundo plano
        if (isLoggingIn) {
          setView('home');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchVisitors = async () => {
    try {
      const data = await visitorService.getVisitors();
      if (data) setVisitors(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'signup') {
        const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        const { data, error } = await tempClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              admin_category: userRole === 'admin' ? userAdminCategory : null,
            }
          }
        });
        if (error) throw error;

        if (data.user) {
          await userService.upsertProfile({
            id: data.user.id,
            email: email,
            display_name: displayName,
            admin_category: userRole === 'admin' ? userAdminCategory : null,
            role: userRole === 'admin' ? 'admin' : 'user'
          });
        }

        setAuthError('Cadastro realizado com sucesso! Você já pode entrar.');
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao fazer logout do Supabase:', err);
    } finally {
      // Força a limpeza de todos os estados no cliente para garantir que saia imediatamento da tela do app
      setUser(null);
      setCurrentUserProfile(null);
      setVisitors([]);
      setProfiles([]);
      setView('home');
      // Remove quaisquer tokens de autenticação salvos locais para evitar login corrompido automático
      try {
        localStorage.removeItem('supabase.auth.token');
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (locErr) {
        console.error('Erro no localStorage ao deslogar:', locErr);
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário da lista? (Isso não remove o acesso dele do Supabase Auth, apenas da lista de gerenciamento)')) return;
    try {
      await userService.deleteProfile(id);
      fetchProfiles();
      setMessage({ type: 'success', text: 'Usuário removido da lista.' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao remover usuário.' });
    }
  };

  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfileId(profile.id);
    setAdminNewUserEmail(profile.email);
    setAdminNewUserDisplayName(profile.display_name);
    setAdminNewUserCategory(profile.admin_category || 'user');
    setAdminNewUserPassword('********'); // Placeholder since we can't edit password
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShareVisitor = (visitor: Visitor) => {
    setSharingVisitor(visitor);
    setSharingObservation('');
    setCopiedLink(false);
  };

  const handleDeleteVisitor = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este visitante?')) return;
    
    try {
      await visitorService.deleteVisitor(id);
      setMessage({ type: 'success', text: 'Visitante removido com sucesso!' });
      fetchVisitors();
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao remover visitante.' });
    }
  };

  const handleEditVisitor = (visitor: Visitor) => {
    let bDate = visitor.birthDate || '';
    if (bDate && bDate.includes('-')) {
      const [y, m, d] = bDate.split('-');
      if (y && y.length === 4) {
        bDate = `${d}/${m}/${y}`;
      }
    }

    setEditingId(visitor.id || null);
    setFormData({
      name: visitor.name,
      phone: visitor.phone,
      address: visitor.address,
      age: visitor.age?.toString() || '',
      gender: visitor.gender || '',
      birthDate: bDate,
      participatesInCell: visitor.participatesInCell || '',
      cellLeader: visitor.cellLeader || '',
      invitedBy: visitor.invitedBy || '',
      category: visitor.category,
      isMarriedOrLivesTogether: visitor.isMarriedOrLivesTogether || '',
      prayerRequest: visitor.prayerRequest || '',
      observation: visitor.observation || ''
    });
    setShowCategoryStep(false);
    setView('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShowCategoryStep(true);
    setFormData({ name: '', phone: '', address: '', age: '', gender: '', birthDate: '', participatesInCell: '', cellLeader: '', category: undefined, isMarriedOrLivesTogether: '', prayerRequest: '', invitedBy: '', observation: '' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      let bDate = formData.birthDate;
      if (bDate && bDate.includes('/') && bDate.length === 10) {
        const [d, m, y] = bDate.split('/');
        bDate = `${y}-${m}-${d}`;
      }

      const visitorData = {
        ...formData,
        birthDate: bDate || undefined,
        age: formData.age ? parseInt(formData.age) : undefined
      };

      if (editingId) {
        await visitorService.updateVisitor(editingId, visitorData);
        setMessage({ type: 'success', text: 'Visitante atualizado com sucesso!' });
      } else {
        await visitorService.addVisitor(visitorData, user?.id);
        setMessage({ type: 'success', text: 'Visitante cadastrado com sucesso!' });
      }

      setFormData({ name: '', phone: '', address: '', age: '', gender: '', birthDate: '', participatesInCell: '', cellLeader: '', category: undefined, isMarriedOrLivesTogether: '', prayerRequest: '', invitedBy: '', observation: '' });
      setEditingId(null);
      setShowCategoryStep(true);
      fetchVisitors();
      
      // Scroll to top to see success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Submit Error:', error);
      setMessage({ type: 'error', text: editingId ? 'Erro ao atualizar visitante.' : 'Erro ao cadastrar visitante.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = (type: 'pdf' | 'txt') => {
    let filtered = [...allowedVisitors];

    // Filter by category
    if (reportCategory !== 'todas') {
      filtered = filtered.filter(v => v.category === reportCategory);
    }

    // Filter by period
    if (reportPeriod !== 'all') {
      if (reportPeriod === 'weekly') {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 7);
        filtered = filtered.filter(v => {
          if (!v.createdAt) return false;
          const date = v.createdAt.seconds ? new Date(v.createdAt.seconds * 1000) : new Date(v.createdAt);
          return date >= limitDate;
        });
      } else if (reportPeriod === 'monthly') {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 30);
        filtered = filtered.filter(v => {
          if (!v.createdAt) return false;
          const date = v.createdAt.seconds ? new Date(v.createdAt.seconds * 1000) : new Date(v.createdAt);
          return date >= limitDate;
        });
      } else if (reportPeriod === 'custom') {
        const targetMonth = parseInt(reportCustomMonth, 10) - 1; // 0-11
        const targetYear = parseInt(reportCustomYear, 10);

        filtered = filtered.filter(v => {
          if (!v.createdAt) return false;
          const date = v.createdAt.seconds ? new Date(v.createdAt.seconds * 1000) : new Date(v.createdAt);
          return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
        });
      }
    }

    if (filtered.length === 0) {
      alert('Nenhum visitante encontrado para os filtros selecionados.');
      return;
    }

    const finalPeriodParam = reportPeriod === 'custom' 
      ? `custom:${reportCustomMonth}:${reportCustomYear}` 
      : reportPeriod;

    if (type === 'pdf') {
      PDFReportGenerator(filtered, reportCategory, finalPeriodParam);
    } else {
      TXTReportGenerator(filtered, reportCategory, finalPeriodParam);
    }
  };

  const sharedData = getSharedVisitorData();

  if (sharedData) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-100 to-blue-50/20 p-4 sm:p-8 flex items-center justify-center font-sans relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 sm:p-10 max-w-2xl w-full text-slate-800 relative overflow-hidden"
        >
          {/* Top aesthetic bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />
          
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-extrabold uppercase text-[10px] sm:text-xs tracking-widest mb-1">
                <Church className="w-5 h-5" />
                <span>Ficha de Visitante Compartilhada</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase mt-2">
                {sharedData.name}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-semibold mt-2 bg-slate-50 px-3 py-1.5 rounded-xl w-fit">
                Idade: {sharedData.age || 'Não inf.'} | Gênero: {sharedData.gender || 'Não inf.'}
              </p>
            </div>
            
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
              sharedData.category === 'homens'
                ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shadow-blue-100/50'
                : sharedData.category === 'mulheres'
                ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-100/50'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm shadow-indigo-100/50'
            }`}>
              {sharedData.category || 'Não inf.'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Telefone Principal</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-bold text-slate-700">{sharedData.phone}</span>
                  <a
                    href={`https://wa.me/55${sharedData.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"
                    title="Chamar no WhatsApp"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mora Junto / Casado</p>
                <p className="text-sm font-semibold text-slate-700 mt-1 capitalize">
                  {sharedData.isMarriedOrLivesTogether || 'Não informado'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Convidado Por</p>
                <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1">
                  <UserPlus className="w-4 h-4 text-slate-400" />
                  {sharedData.invitedBy || 'Chegou sozinho'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Participa de Célula</p>
                {sharedData.participatesInCell === 'sim' ? (
                  <div className="mt-1">
                    <p className="text-sm font-bold text-slate-700">Líder: {sharedData.cellLeader || 'Não inf.'}</p>
                    <span className="inline-block mt-1 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full">
                      Membro Ativo de Célula
                    </span>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-500 mt-1">Não participa de célula</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Endereço</p>
                <p className="text-sm font-semibold text-slate-600 mt-1 flex items-start gap-1">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span>{sharedData.address || 'Não informado'}</span>
                </p>
              </div>

              {sharedData.prayerRequest && (
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pedido de Oração</p>
                  <p className="text-sm italic text-slate-600 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 mt-1 leading-relaxed">
                    "{sharedData.prayerRequest}"
                  </p>
                </div>
              )}

              {sharedData.obs && (
                <div className="bg-blue-50/70 border-2 border-blue-100 p-4 rounded-3xl mt-4">
                  <div className="flex items-center gap-2 text-blue-700 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>Observação Extra Adicionada</span>
                  </div>
                  <p className="text-slate-700 text-sm font-semibold leading-relaxed">
                    {sharedData.obs}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                window.location.href = window.location.origin + window.location.pathname;
              }}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800 h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Ir para Tela de Login Base
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 border-2 border-slate-100 text-slate-600 hover:bg-slate-50 h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Imprimir
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Image for Login Screen */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2070" 
            alt="Pessoas unidas em círculo com mãos ao centro" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-900/10" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-5 sm:p-8 max-w-[310px] sm:max-w-[380px] w-full mx-auto border border-white/50"
        >
          <div className="bg-blue-100 w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
            <Church className="text-blue-600 w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 text-center mb-1 tracking-tighter">Consolidação</h1>
          <p className="text-blue-600 font-bold text-center mb-4 sm:mb-6 text-[9px] sm:text-[12px] uppercase tracking-[0.2em] px-3 py-1 bg-blue-50 rounded-lg w-fit mx-auto">Novo na Igreja</p>

          <form onSubmit={handleEmailAuth} className="space-y-2.5 sm:space-y-4">
            {authError && (
              <div className="p-2 sm:p-3 rounded-lg bg-red-50 text-red-600 text-[11px] sm:text-sm border border-red-100 italic font-medium">
                {authError}
              </div>
            )}

            {authMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    required
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    className="input-field pl-10 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {authMode === 'signup' && (
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Conta</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setUserRole('user')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100`}
                    >
                      Visitador
                    </button>
                  </div>
                </div>

                {userRole === 'admin' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Admin de:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['homens', 'mulheres', 'jovens'] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setUserAdminCategory(cat)}
                          className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-tight border-2 transition-all ${userAdminCategory === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5 ml-1">E-mail</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@igreja.com"
                  className="input-field pl-10 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase mb-0.5 ml-1">Senha</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 py-2 text-sm"
                />
              </div>
            </div>

            <button 
              disabled={authLoading}
              className="w-full btn-primary h-9 sm:h-11 flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Entrar'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row h-screen h-[100dvh] overflow-hidden bg-white sm:bg-slate-50 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden sm:flex flex-col w-20 lg:w-64 bg-white border-r border-slate-200 shrink-0 z-30">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-50">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <Church className="w-6 h-6" />
          </div>
          <h1 className="font-black text-lg text-slate-800 hidden lg:block truncate">Sistema</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setView('home')}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Início</span>
          </button>
          <button 
            onClick={() => {
              setView('register');
              setShowCategoryStep(true);
              handleCancelEdit();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <UserPlus className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Novo Visitante</span>
          </button>
            {isUserAdmin && (
              <button 
                onClick={() => {
                  setView('list');
                  setReportCategory(effectiveAdminCategory as any);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              >
                <FileText className="w-6 h-6 shrink-0" />
                <span className="font-bold text-sm hidden lg:block">Relatórios</span>
              </button>
            )}
            {isUserAdmin && (
              <button 
                onClick={() => setView('users')}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${view === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              >
                <Users className="w-6 h-6 shrink-0" />
                <span className="font-bold text-sm hidden lg:block">Usuários</span>
              </button>
            )}
        </nav>

        <div className="p-4 border-t border-slate-50 shrink-0">
          <div className="bg-slate-50 p-3 rounded-2xl mb-3 hidden lg:block">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Usuário Logado</p>
            <p className="text-xs font-bold text-slate-700 truncate">{currentUserProfile?.display_name || user.user_metadata?.display_name || user.email || 'Usuário'}</p>
            <p className="text-[9px] font-black text-blue-500 uppercase mt-1">
              {isUserAdmin ? `Admin ${effectiveAdminCategory || ''}` : 'Visitador'}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="font-bold text-sm hidden lg:block">Sair do App</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header - Mobile */}
        {view !== 'home' && (
          <header className="sm:hidden flex bg-white/90 backdrop-blur-lg border-b border-slate-100 h-14 shrink-0 z-20 px-4 items-center justify-between sticky top-0">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Church className="w-5 h-5" />
              </div>
              <h1 className="font-black text-base text-slate-900 tracking-tight">IPCC.</h1>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </header>
        )}

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto px-0 py-0 relative h-full">
          <AnimatePresence mode="wait">
            {view === 'home' ? (
              <motion.div 
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative min-h-full w-full flex flex-col items-center justify-between text-center"
              >
                {/* Background Image - Full Screen App Look */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                   <img 
                    src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2070" 
                    alt="Pessoas unidas em círculo com mãos ao centro" 
                    className="w-full h-full object-cover"
                  />
                  {/* Reduced overlay for maximum image impact */}
                  <div className="absolute inset-0 bg-blue-900/5" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-blue-900/30" />
                </div>

                {/* Top Actions (Minimalist) */}
                <div className="relative z-10 w-full p-6 flex justify-end">
                  <button 
                    onClick={handleLogout}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white/80 hover:bg-white/20 active:scale-95 transition-all border border-white/10"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* Centered Content */}
                <div className="relative z-10 w-full max-w-sm px-6 pb-24 sm:pb-20">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-12 w-fit mx-auto text-left"
                  >
                    <div className="bg-white/10 backdrop-blur-2xl p-5 rounded-[2rem] w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
                      <Church className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <h2 className="text-4xl sm:text-7xl font-black text-white mb-4 tracking-tighter uppercase leading-none drop-shadow-xl">
                      Consolidação
                    </h2>
                    <div className="w-fit px-4 py-2 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30">
                      <p className="text-xs sm:text-sm font-black text-blue-100 tracking-[0.4em] uppercase">
                        Novo na Igreja
                      </p>
                    </div>
                  </motion.div>

                  <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => {
                      setView('register');
                      setShowCategoryStep(true);
                      handleCancelEdit();
                    }}
                    className="w-full bg-white text-blue-950 h-16 rounded-[2rem] font-black text-xl uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                  >
                    Iniciar
                    <div className="bg-blue-950/10 p-2 rounded-full group-hover:translate-x-1 transition-transform">
                      <UserPlus className="w-6 h-6" />
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <div className="px-4 py-4 sm:px-10 sm:py-12 pb-20 sm:pb-12 max-w-4xl mx-auto w-full">
                {view === 'register' ? (
                  <motion.div 
                    key="register"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="mb-2 px-1 flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {editingId ? 'Editar Visitante' : 'Cadastrar Visitante'}
                      </h2>
                      <p className="text-slate-500 text-xs sm:text-sm font-medium tracking-tight">
                        {editingId ? 'Corrija as informações necessárias.' : 'Registre as informações para o banco de dados.'}
                      </p>
                    </div>
                    {editingId && (
                      <button 
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  <div className="card-native p-4 sm:p-10 transform transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/5">
                    {showCategoryStep && !editingId ? (
                      <div className="space-y-8 py-4">
                        <div className="text-center">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">Selecione o Grupo</h3>
                          <p className="text-slate-500 text-sm font-medium">Para quem é este cadastro?</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 max-w-sm mx-auto">
                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category: 'homens', gender: 'M' }));
                              setShowCategoryStep(false);
                            }}
                            className="bg-white border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/50 p-6 rounded-[2rem] flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-100 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <User className="w-6 h-6" />
                              </div>
                              <span className="font-black text-lg text-slate-700 group-hover:text-blue-700">Homens</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                          </button>

                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category: 'mulheres', gender: 'F' }));
                              setShowCategoryStep(false);
                            }}
                            className="bg-white border-2 border-slate-100 hover:border-pink-600 hover:bg-pink-50/50 p-6 rounded-[2rem] flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-pink-100 p-3 rounded-2xl group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                <User className="w-6 h-6" />
                              </div>
                              <span className="font-black text-lg text-slate-700 group-hover:text-pink-700">Mulheres</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                          </button>

                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category: 'jovens' }));
                              setShowCategoryStep(false);
                            }}
                            className="bg-white border-2 border-slate-100 hover:border-violet-600 hover:bg-violet-50/50 p-6 rounded-[2rem] flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-violet-100 p-3 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                <Sparkles className="w-6 h-6" />
                              </div>
                              <span className="font-black text-lg text-slate-700 group-hover:text-violet-700">Jovens</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`mb-8 p-5 rounded-2xl flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                          >
                            {message.type === 'success' && <CheckCircle2 className="w-6 h-6 shrink-0" />}
                            <span className="font-bold text-sm">{message.text}</span>
                            <button onClick={() => setMessage(null)} className="ml-auto p-1 bg-white/20 rounded-lg hover:bg-white/40">×</button>
                          </motion.div>
                        )}

                        <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Visitante</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                          <input 
                            required
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Nome completo do visitante"
                            className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                            <input 
                              required
                              type="tel" 
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              placeholder="(00) 00000-0000"
                              className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2 col-span-2 sm:col-span-1">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nasc.</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                            <input 
                              type="text" 
                              value={formData.birthDate}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length > 8) val = val.slice(0, 8);
                                if (val.length >= 5) {
                                  val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                                } else if (val.length >= 3) {
                                  val = `${val.slice(0, 2)}/${val.slice(2)}`;
                                }
                                setFormData({...formData, birthDate: val});
                              }}
                              placeholder="DD/MM/AAAA"
                              className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                            />
                          </div>
                        </div>
                        <div className="space-y-1 sm:space-y-2 col-span-2 sm:col-span-1">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexo</label>
                          <div className="flex gap-4 p-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, gender: 'M'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.gender === 'M' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Masculino
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, gender: 'F'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.gender === 'F' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Feminino
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Participa de uma célula?</label>
                          <div className="flex gap-4 p-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, participatesInCell: 'sim'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.participatesInCell === 'sim' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, participatesInCell: 'nao', cellLeader: '', invitedBy: ''})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.participatesInCell === 'nao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Não
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {formData.participatesInCell === 'sim' && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, marginTop: -20 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                              exit={{ opacity: 0, height: 0, marginTop: -20 }}
                              className="space-y-1 sm:space-y-2 overflow-hidden"
                            >
                              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Líder</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                                <input 
                                  type="text" 
                                  value={formData.cellLeader}
                                  onChange={(e) => setFormData({...formData, cellLeader: e.target.value})}
                                  placeholder="Nome do líder da célula"
                                  className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                                />
                              </div>
                            </motion.div>
                          )}
                          {formData.participatesInCell === 'nao' && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, marginTop: -20 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                              exit={{ opacity: 0, height: 0, marginTop: -20 }}
                              className="space-y-1 sm:space-y-2 overflow-hidden"
                            >
                              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">foi convidado por alguém?</label>
                              <div className="relative">
                                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                                <input 
                                  type="text" 
                                  value={formData.invitedBy}
                                  onChange={(e) => setFormData({...formData, invitedBy: e.target.value})}
                                  placeholder="Nome de quem convidou"
                                  className="input-field pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Mora Junto ou é casado?</label>
                          <div className="flex gap-4 p-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, isMarriedOrLivesTogether: 'sim'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.isMarriedOrLivesTogether === 'sim' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, isMarriedOrLivesTogether: 'nao'})}
                              className={`flex-1 h-12 sm:h-14 rounded-2xl font-bold transition-all border-2 ${formData.isMarriedOrLivesTogether === 'nao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-4 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                          <textarea 
                            required
                            rows={2}
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="Rua, Número, Bairro e Cidade"
                            className="input-field pl-10 sm:pl-12 pt-3 sm:pt-4 resize-none text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Algum pedido de Oração?</label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-4 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                          <textarea 
                            rows={3}
                            value={formData.prayerRequest}
                            onChange={(e) => setFormData({...formData, prayerRequest: e.target.value})}
                            placeholder="Escreva aqui o pedido de oração se houver..."
                            className="input-field pl-10 sm:pl-12 pt-3 sm:pt-4 resize-none text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações do Visitante (Opcional)</label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-4 text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
                          <textarea 
                            rows={3}
                            value={formData.observation}
                            onChange={(e) => setFormData({...formData, observation: e.target.value})}
                            placeholder="Algum detalhe complementar sobre a visita, observação extra ou notas..."
                            className="input-field pl-10 sm:pl-12 pt-3 sm:pt-4 resize-none text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <button 
                        disabled={isSubmitting}
                        className="w-full btn-primary h-14 sm:h-16 group"
                      >
                        {isSubmitting ? (
                          <Loader2 className="animate-spin w-6 h-6" />
                        ) : (
                          <div className="flex items-center gap-2">
                            {editingId ? <CheckCircle2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                            <span>{editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
                </motion.div>
              ) : view === 'users' && isUserAdmin ? (
                <motion.div 
                  key="users"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 sm:space-y-8"
                >
                  <div className="mb-2 px-1">
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">Usuários</h2>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium tracking-tight">Gerencie os acessos do sistema.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Create User Form */}
                    <div className="card-native p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {editingProfileId ? 'Editar Acesso' : 'Cadastrar Novo Acesso'}
                          </h3>
                        </div>
                        {editingProfileId && (
                          <button 
                            onClick={() => {
                              setEditingProfileId(null);
                              setAdminNewUserEmail('');
                              setAdminNewUserDisplayName('');
                              setAdminNewUserPassword('');
                              setAdminNewUserCategory('user');
                            }}
                            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>

                      {adminCreateMessage && (
                        <div className={`mb-6 p-4 rounded-xl text-xs font-bold italic border ${
                          adminCreateMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                        }`}>
                          {adminCreateMessage.text}
                        </div>
                      )}

                      <form onSubmit={handleAdminCreateAccount} className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                          <input 
                            required
                            type="text" 
                            value={adminNewUserDisplayName}
                            onChange={(e) => setAdminNewUserDisplayName(e.target.value)}
                            placeholder="Nome do colaborador"
                            className="input-field py-3"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                          <input 
                            required
                            disabled={!!editingProfileId}
                            type="email" 
                            value={adminNewUserEmail}
                            onChange={(e) => setAdminNewUserEmail(e.target.value)}
                            placeholder="exemplo@igreja.com"
                            className="input-field py-3 disabled:opacity-50"
                          />
                          {editingProfileId && <p className="text-[9px] text-slate-400 mt-1 italic">* O e-mail não pode ser alterado aqui.</p>}
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                          <input 
                            required={!editingProfileId}
                            disabled={!!editingProfileId}
                            type="password" 
                            value={adminNewUserPassword}
                            onChange={(e) => setAdminNewUserPassword(e.target.value)}
                            placeholder={editingProfileId ? "••••••••" : "Crie uma senha"}
                            className="input-field py-3 disabled:opacity-50"
                          />
                          {editingProfileId && <p className="text-[9px] text-slate-400 mt-1 italic">* A senha não pode ser alterada aqui.</p>}
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                          <div className={`grid gap-2 mt-2 ${isMasterAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1'}`}>
                            {(isMasterAdmin ? [
                              { id: 'user', label: 'Visitador' },
                              { id: 'homens', label: 'Admin Homem' },
                              { id: 'mulheres', label: 'Admin Mulher' },
                              { id: 'jovens', label: 'Admin Jovem' }
                            ] : [
                              { id: 'user', label: 'Visitador' }
                            ]).map(role => (
                              <button
                                key={role.id}
                                type="button"
                                disabled={!isMasterAdmin && role.id !== 'user'}
                                onClick={() => setAdminNewUserCategory(role.id as any)}
                                className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-tighter border-2 transition-all ${
                                  adminNewUserCategory === role.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                }`}
                              >
                                {role.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button 
                          disabled={adminCreateLoading}
                          className="w-full btn-primary h-12 flex items-center justify-center gap-2 mt-4"
                        >
                          {adminCreateLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (editingProfileId ? 'Salvar Alterações' : 'Criar Cadastro')}
                        </button>
                      </form>
                    </div>

                    {/* Current User Info */}
                    <div className="card-native p-6 sm:p-8 bg-slate-900 text-white self-start">
                      <h3 className="text-lg font-black mb-6 uppercase tracking-widest flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                        Seu Perfil
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Código</p>
                          <p className="font-mono text-sm font-bold text-blue-400 bg-blue-900/50 px-2 py-1 rounded-md inline-block">
                            {user?.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome</p>
                          <p className="text-xl font-black">{currentUserProfile?.display_name || user?.user_metadata?.display_name || 'Admin'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail</p>
                          <p className="text-slate-300 font-medium">{user?.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nível</p>
                          <span className="inline-block px-3 py-1 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mt-1">
                            Administrador {effectiveAdminCategory}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="card-native p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                          <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Equipe Cadastrada</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {isMasterAdmin && (
                          <button 
                            onClick={handleAdminDeleteByEmail}
                            className="mr-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-xl transition-all flex items-center gap-2"
                            title="Remover conta presa do Supabase (por e-mail)"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Limpeza Manual Auth
                          </button>
                        )}
                        <button 
                          onClick={fetchProfiles}
                          disabled={profilesLoading}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50"
                          title="Recarregar lista"
                        >
                          <RefreshCw className={`w-4 h-4 ${profilesLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {profilesError && (
                      <div className="mb-6">
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold italic">
                          {profilesError}
                        </div>
                        <div className="bg-slate-900 p-5 rounded-2xl text-slate-300 font-mono text-[10px] space-y-2 overflow-x-auto border-2 border-blue-500/30">
                          <p className="text-blue-400 font-bold mb-2 uppercase tracking-widest text-[9px]">Ação Necessária no Supabase Dashboard:</p>
                          <p>1. Vá em <span className="text-white">SQL Editor</span></p>
                          <p>2. Cole e execute o código abaixo:</p>
                          <div className="bg-black/50 p-3 rounded-lg text-emerald-400 select-all border border-slate-700 mt-3">
                            <pre>
{`-- 1. Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  admin_category TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Perfis visíveis para todos" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem criar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem editar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins master podem deletar" ON public.profiles;
DROP POLICY IF EXISTS "Leitura pública para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Inserção pelo próprio usuário" ON public.profiles;
DROP POLICY IF EXISTS "Edição pelo próprio usuário ou Master" ON public.profiles;
DROP POLICY IF EXISTS "Deleção por Master" ON public.profiles;
DROP POLICY IF EXISTS "Gerenciar perfis" ON public.profiles;

-- 4. Criar novas políticas robustas
CREATE POLICY "Leitura de perfis para autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gerenciar perfis" ON public.profiles
  FOR ALL TO authenticated USING (
    auth.uid() = id OR 
    (auth.jwt() ->> 'email' = 'adminnovo@gmail.com') OR
    (auth.jwt() -> 'raw_user_meta_data' ->> 'admin_category') IS NOT NULL
  ) WITH CHECK (
    auth.uid() = id OR 
    (auth.jwt() ->> 'email' = 'adminnovo@gmail.com') OR
    (auth.jwt() -> 'raw_user_meta_data' ->> 'admin_category') IS NOT NULL
  );

-- 5. SCRIPT PARA APAGAR TODOS USUÁRIOS EXCETO MASTER
-- Execute isto no SQL Editor para limpar usuários:
-- DELETE FROM auth.users WHERE email != 'adminnovo@gmail.com';
-- (A tabela public.profiles será limpa automaticamente)`}
                            </pre>
                          </div>
                          <button 
                            onClick={fetchProfiles}
                            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-blue-700 transition-colors"
                          >
                            Já executei o código, tentar novamente
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                            <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                            <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</th>
                            <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nível</th>
                            <th className="py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {profilesLoading ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center">
                                <div className="flex items-center justify-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Carregando Equipe...
                                </div>
                              </td>
                            </tr>
                          ) : profiles.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">Nenhum usuário listado.</td>
                            </tr>
                          ) : (
                            profiles.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-2">
                                  <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                    {p.id.slice(0, 8).toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{p.display_name}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  <span className="text-xs text-slate-500 font-medium">{p.email}</span>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${
                                    p.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {p.role === 'admin' ? `Admin ${p.admin_category || ''}` : 'Visitador'}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isMasterAdmin && (
                                      <button 
                                        onClick={() => handleAdminChangePassword(p.id!)}
                                        disabled={isChangingPassword === p.id}
                                        className="p-2 text-amber-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-50"
                                        title="Alterar senha do usuário"
                                      >
                                        {isChangingPassword === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleEditProfile(p)}
                                      className="p-2 text-blue-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                      title="Editar informações"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (isMasterAdmin) {
                                          handleAdminDeleteUser(p.id!, p.email);
                                        } else {
                                          handleDeleteUser(p.id!);
                                        }
                                      }}
                                      disabled={isDeletingUser === p.id}
                                      className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                                      title={isMasterAdmin ? "Excluir conta permanentemente" : "Remover usuário da lista"}
                                    >
                                      {isDeletingUser === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                    key="list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-8"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                      <div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">Relatórios & Gestão</h2>
                        <p className="text-slate-500 text-sm font-medium tracking-tight">Total de {allowedVisitors.length} registros.</p>
                      </div>
                    </div>

                    {/* Advanced Report Config Card */}
                    <div className="card-native p-6 sm:p-8 bg-white border-2 border-blue-100 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                        <FileText className="w-32 h-32 text-blue-900" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200">
                            <FileText className="w-6 h-6" />
                          </div>
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configurar Exportação</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          {/* Period Filter */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Período de Cadastro</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'all', label: 'Tudo' },
                                { id: 'weekly', label: 'Semanal' },
                                { id: 'monthly', label: 'Mensal' },
                                { id: 'custom', label: 'Escolher Mês/Ano' }
                              ].map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => setReportPeriod(p.id as any)}
                                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${reportPeriod === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>

                            <AnimatePresence>
                              {reportPeriod === 'custom' && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="pt-2 overflow-hidden"
                                >
                                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 flex gap-4 items-center w-full">
                                    <div className="flex-1">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Mês</label>
                                      <select
                                        value={reportCustomMonth}
                                        onChange={(e) => setReportCustomMonth(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-600 transition-all cursor-pointer shadow-sm"
                                      >
                                        <option value="1">Janeiro</option>
                                        <option value="2">Fevereiro</option>
                                        <option value="3">Março</option>
                                        <option value="4">Abril</option>
                                        <option value="5">Maio</option>
                                        <option value="6">Junho</option>
                                        <option value="7">Julho</option>
                                        <option value="8">Agosto</option>
                                        <option value="9">Setembro</option>
                                        <option value="10">Outubro</option>
                                        <option value="11">Novembro</option>
                                        <option value="12">Dezembro</option>
                                      </select>
                                    </div>
                                    <div className="w-[100px]">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Ano</label>
                                      <input
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        placeholder="2026"
                                        value={reportCustomYear}
                                        onChange={(e) => setReportCustomYear(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-600 transition-all shadow-sm"
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Category Filter */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                              <Users className="w-3.5 h-3.5" />
                              <span>Filtrar por Grupo</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {isUserAdmin && !isMasterAdmin ? (
                                <div className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white border-2 border-blue-600 shadow-lg shadow-blue-200">
                                  {effectiveAdminCategory}
                                </div>
                              ) : (
                                (['homens', 'mulheres', 'jovens', 'todas'] as const).map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => setReportCategory(c)}
                                    className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${reportCategory === c ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}
                                  >
                                    {c}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100 flex flex-wrap gap-4">
                          <button 
                            disabled={allowedVisitors.length === 0}
                            onClick={() => handleGenerateReport('pdf')}
                            className="flex-1 sm:flex-none bg-blue-600 text-white hover:bg-blue-700 px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-40"
                          >
                            <Download className="w-5 h-5" />
                            Gerar PDF
                          </button>
                          <button 
                            disabled={allowedVisitors.length === 0}
                            onClick={() => handleGenerateReport('txt')}
                            className="flex-1 sm:flex-none bg-emerald-600 text-white hover:bg-emerald-700 px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-40"
                          >
                            <FileText className="w-5 h-5" />
                            Exportar TXT
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Visitantes Cadastrados */}
                    <div className="card-native p-6 sm:p-8 bg-white border-2 border-slate-100 shadow-xl shadow-slate-900/5 mt-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2.5 rounded-2xl text-slate-600">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Visitantes</h3>
                            <p className="text-slate-400 text-xs font-semibold">
                              Exibindo {displayVisitors.length} de {allowedVisitors.length} registros
                            </p>
                          </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={visitorSearchTerm}
                            onChange={(e) => setVisitorSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border-2 border-slate-100 placeholder-slate-300 text-slate-700 text-sm focus:border-blue-500 focus:outline-none transition-all"
                          />
                          {visitorSearchTerm && (
                            <button
                              onClick={() => setVisitorSearchTerm('')}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      {displayVisitors.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm font-semibold">Nenhum visitante cadastrado ou encontrado.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto -mx-6 sm:-mx-8">
                          <div className="inline-block min-w-full align-middle px-6 sm:px-8">
                            <table className="min-w-full divide-y divide-slate-100">
                              <thead>
                                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-left">
                                  <th className="pb-4 pt-1 font-black">Nome</th>
                                  <th className="pb-4 pt-1 font-black">Grupo</th>
                                  <th className="pb-4 pt-1 font-black">Telefone</th>
                                  <th className="pb-4 pt-1 font-black">Líder / Célula</th>
                                  <th className="pb-4 pt-1 font-black">Quem Convidou</th>
                                  <th className="pb-4 pt-1 font-black text-right">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {displayVisitors.map((visitor) => (
                                  <tr key={visitor.id} className="hover:bg-slate-50/50 transition-all text-slate-700 text-sm font-medium">
                                    <td className="py-4 font-semibold text-slate-900">
                                      <div>
                                        <p>{visitor.name}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          Idade: {visitor.age || 'Não inf.'} | {visitor.gender || 'Não inf.'}
                                        </p>
                                        {visitor.observation && (
                                          <div className="mt-1">
                                            <span 
                                              title={visitor.observation}
                                              className="text-[10px] bg-slate-100/90 text-slate-600 px-2 py-0.5 rounded-md font-semibold border border-slate-200/50 inline-block max-w-[200px] truncate"
                                            >
                                              Obs: {visitor.observation}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4">
                                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                                        visitor.category === 'homens'
                                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                          : visitor.category === 'mulheres'
                                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                          : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                      }`}>
                                        {visitor.category || 'Não inf.'}
                                      </span>
                                    </td>
                                    <td className="py-4 text-slate-500 text-xs sm:text-sm">{visitor.phone}</td>
                                    <td className="py-4 text-slate-500 text-xs">
                                      {visitor.participatesInCell === 'sim' ? (
                                        <div>
                                          <p className="font-semibold text-slate-600">Líder: {visitor.cellLeader || 'Não inf.'}</p>
                                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">Participa de Célula</p>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">Não participa</span>
                                      )}
                                    </td>
                                    <td className="py-4 text-slate-500 text-xs">{visitor.invitedBy || 'Ninguém'}</td>
                                    <td className="py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => handleShareVisitor(visitor)}
                                          className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                                          title="Compartilhar Visitante"
                                        >
                                          <Share2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleEditVisitor(visitor)}
                                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                                          title="Editar Visitante"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteVisitor(visitor.id!)}
                                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                                          title="Excluir Visitante"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

        {/* Mobile Navbar */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-100 h-14 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          <button 
            onClick={() => setView('home')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${view === 'home' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <ShieldCheck className={`w-6 h-6 ${view === 'home' ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
          </button>
          
          <button 
            onClick={() => setView('register')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${view === 'register' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <UserPlus className={`w-6 h-6 ${view === 'register' ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Novo</span>
          </button>
          
          {isUserAdmin && (
            <button 
              onClick={() => {
                setView('list');
                setReportCategory(effectiveAdminCategory as any);
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${view === 'list' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <FileText className={`w-6 h-6 ${view === 'list' ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Relatórios</span>
            </button>
          )}

          {isUserAdmin && (
            <button 
              onClick={() => setView('users')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${view === 'users' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <Users className={`w-6 h-6 ${view === 'users' ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Usuários</span>
            </button>
          )}
        </nav>

        {/* Modal de Compartilhamento */}
        <AnimatePresence>
          {sharingVisitor && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col relative"
              >
                <button
                  onClick={() => setSharingVisitor(null)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-2xl">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Compartilhar Visitante</h3>
                    <p className="text-slate-400 text-xs font-semibold">{sharingVisitor.name}</p>
                  </div>
                </div>

                <div className="space-y-4 my-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Observação Extra (Opcional)</label>
                    <textarea
                      rows={3}
                      placeholder="Escreva alguma observação ou detalhe adicional para enviar junto com o visitante..."
                      value={sharingObservation}
                      onChange={(e) => {
                        setSharingObservation(e.target.value);
                        setCopiedLink(false);
                      }}
                      className="w-full rounded-2xl border-2 border-slate-100 p-3 text-slate-700 text-sm focus:border-blue-500 focus:outline-none transition-all placeholder-slate-300 resize-none min-h-[90px]"
                    />
                  </div>

                  <div className="bg-blue-50/50 rounded-2xl p-5 border-2 border-blue-100 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                      Ficha Pronta em Formato de Texto (.txt)
                    </p>
                    
                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-blue-50 shadow-sm">
                      <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-200">
                        <FileText className="w-5 h-5 font-bold" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          ficha_visitante_${sharingVisitor.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.txt
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Texto Universal (.txt)</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadVisitorTxt(sharingVisitor, sharingObservation)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-900/10 active:scale-95 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      Baixar Arquivo de Texto (.txt)
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setSharingVisitor(null)}
                    className="flex-1 border-2 border-slate-100 hover:bg-slate-50 h-12 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 transition-all active:scale-95"
                  >
                    Fechar
                  </button>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `*IP IPCC - FICHA DE VISITANTE*\n\n` +
                      `*Nome:* ${sharingVisitor.name.toUpperCase()}\n` +
                      `*Telefone:* ${sharingVisitor.phone}\n` +
                      `*Grupo:* ${sharingVisitor.category ? sharingVisitor.category.toUpperCase() : 'Não inf.'}\n` +
                      `*Idade/Sexo:* ${sharingVisitor.age || 'Não inf.'} anos | ${sharingVisitor.gender || 'Não inf.'}\n` +
                      `*Célula:* ${sharingVisitor.participatesInCell === 'sim' ? `Sim (Líder: ${sharingVisitor.cellLeader || 'Não inf.'})` : 'Não'}\n` +
                      (sharingVisitor.invitedBy ? `*Convidado por:* ${sharingVisitor.invitedBy}\n` : '') +
                      (sharingVisitor.address ? `*Endereço:* ${sharingVisitor.address}\n` : '') +
                      (sharingVisitor.prayerRequest ? `*Pedido de Oração:* ${sharingVisitor.prayerRequest}\n` : '') +
                      (sharingObservation ? `\n*Ficha Adicional / Observação:* ${sharingObservation}\n` : '')
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 h-12 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-900/10"
                  >
                    <Phone className="w-4 h-4" />
                    Enviar via WhatsApp
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
