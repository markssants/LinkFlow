import { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Lock,
  LogOut, 
  RefreshCw, 
  Settings, 
  MessageSquare, 
  ArrowRight, 
  Users, 
  Trash2, 
  Info,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  Database,
  Cloud,
  Moon,
  Sun
} from 'lucide-react';
import { AffiliateConfigurator } from './components/AffiliateConfigurator';
import DealsViewer from './components/DealsViewer';
import { ConnectionStatus, Group, ForwardLog, WhatsAppState, AffiliateConfig } from './types';
import { auth, googleProvider } from './lib/firebase-client';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'affiliates' | 'deals'>('dashboard');
  
  const [isAppUnlocked, setIsAppUnlocked] = useState(() => {
    try {
      return localStorage.getItem('appUnlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Higor7') {
      setIsAppUnlocked(true);
      setPasswordError(false);
      try {
        localStorage.setItem('appUnlocked', 'true');
      } catch (e) {}
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);
  
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Error signing in:', e);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  // Application State
  const [state, setState] = useState<WhatsAppState>({
    status: 'disconnected',
    qr: null,
    userInfo: null,
    masterGroup: null,
    targetGroups: [],
    availableGroups: [],
    logs: [],
    includeSenderPrefix: false,
    forwardDelayMs: 5000,
    cloudPersistenceEnabled: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Selection states
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  // Fetch server state
  const fetchState = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch('/api/state');
      if (response.ok) {
        const data: WhatsAppState = await response.json();
        setState(data);
        
        // Sync select inputs
        if (data.masterGroup) {
          setSelectedMasterId(data.masterGroup.id);
        }
      }
    } catch (err: any) {
      if (!err?.message?.includes('Failed to fetch')) {
        console.error('Erro ao buscar estado da aplicação:', err);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Poll state every 2 seconds
  useEffect(() => {
    fetchState(true);
    const interval = setInterval(() => {
      fetchState(false);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Set Master Group
  const handleSetMasterGroup = async (groupId: string) => {
    if (!groupId) return;
    const targetGroup = state.availableGroups.find(g => g.id === groupId);
    if (!targetGroup) return;

    try {
      const response = await fetch('/api/config/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: targetGroup }),
      });
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, masterGroup: data.masterGroup }));
      }
    } catch (err) {
      console.error('Erro ao configurar grupo mestre:', err);
    }
  };

  // Add Target Group
  const handleAddTargetGroup = async (groupId: string) => {
    if (!groupId) return;
    const targetGroup = state.availableGroups.find(g => g.id === groupId);
    if (!targetGroup) return;

    try {
      const response = await fetch('/api/config/target/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: targetGroup }),
      });
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, targetGroups: data.targetGroups }));
        setSelectedTargetId(''); // Reset selector
      }
    } catch (err) {
      console.error('Erro ao adicionar grupo de destino:', err);
    }
  };

  // Remove Target Group
  const handleRemoveTargetGroup = async (id: string) => {
    try {
      const response = await fetch('/api/config/target/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, targetGroups: data.targetGroups }));
      }
    } catch (err) {
      console.error('Erro ao remover grupo de destino:', err);
    }
  };

  // Toggle sender prefix option
  const handleTogglePrefix = async (checked: boolean) => {
    try {
      const response = await fetch('/api/config/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeSenderPrefix: checked }),
      });
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, includeSenderPrefix: data.includeSenderPrefix }));
      }
    } catch (err) {
      console.error('Erro ao alterar opção de prefixo:', err);
    }
  };

  // Update forward delay setting
  const handleUpdateDelay = async (delayMs: number) => {
    try {
      const response = await fetch('/api/config/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forwardDelayMs: delayMs }),
      });
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, forwardDelayMs: data.forwardDelayMs }));
      }
    } catch (err) {
      console.error('Erro ao alterar delay de envio:', err);
    }
  };

  // Toggle database cloud persistence sync setting
  const handleToggleCloudPersistence = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/config/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudPersistenceEnabled: enabled }),
      });
      if (response.ok) {
        await fetchState(false);
      }
    } catch (err) {
      console.error('Erro ao alterar persistência na nuvem:', err);
    }
  };

  // Refresh available groups on WhatsApp
  const handleRefreshGroups = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/refresh-groups', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, availableGroups: data.availableGroups }));
      }
    } catch (err) {
      console.error('Erro ao atualizar grupos:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveAffiliateConfig = async (config: AffiliateConfig) => {
    try {
      const response = await fetch('/api/config/affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, affiliateConfig: data.affiliateConfig }));
      }
    } catch (err) {
      console.error('Erro ao salvar config de afiliados:', err);
    }
  };

  // Trigger disconnect (Logout)
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/disconnect', { method: 'POST' });
      if (response.ok) {
        await fetchState(false);
      }
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Filter available groups for suggestions (excluding currently configured groups)
  const filteredAvailableForMaster = state.availableGroups.filter(
    g => g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredAvailableForTarget = state.availableGroups.filter(
    g => !state.targetGroups.some(tg => tg.id === g.id) && g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  if (isAuthLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 dark:text-slate-200 font-sans transition-colors">Carregando...</div>;
  }

  if (!isAppUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 font-sans transition-colors">
        <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 text-center max-w-sm w-full mx-4 transition-colors">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-slate-100 mb-2">Acesso Restrito</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Por favor, insira a senha para desbloquear o LinkFlow.
          </p>
          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Senha de acesso"
                className={`w-full px-4 py-3 rounded-xl border ${passwordError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'} dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-2 text-left">Senha incorreta. Tente novamente.</p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Desbloquear App</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 font-sans transition-colors">
        <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 text-center max-w-sm w-full mx-4 transition-colors">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-slate-100 mb-2">Bem-vindo ao LinkFlow</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Faça login com sua conta Google para gerenciar seus redirecionamentos de mensagens.
          </p>
          <button 
            onClick={handleSignIn} 
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>Continuar com Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans antialiased Selection:bg-emerald-100 dark:Selection:bg-emerald-900/40 Selection:text-emerald-900 dark:Selection:text-emerald-100 pb-12 transition-colors">
      {/* Top Header Panel */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 sticky top-0 z-10 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-white p-2 rounded-xl shadow-inner flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 id="app-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                LinkFlow
              </h1>
            </div>
          </div>

          {/* Connection Status Badge & Logout */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 mr-2 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-full transition-all cursor-pointer"
              title="Trocar tema"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-2 hidden sm:inline">{user.email}</span>
            <button
               onClick={handleSignOut}
               className="text-xs text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-100 font-semibold mr-4 cursor-pointer"
            >
              Sair
            </button>
            {state.status === 'connected' ? (
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado: {state.userInfo?.name || 'Admin'}
                </span>
                <button
                  id="btn-disconnect"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200 disabled:opacity-50"
                  title="Desconectar Sessão"
                >
                  <LogOut className={`w-3.5 h-3.5 mr-1 ${isDisconnecting ? 'animate-spin' : ''}`} />
                  Sair do WhatsApp
                </button>
              </div>
            ) : state.status === 'connecting' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-amber-500" />
                Iniciando...
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-2 h-2 mr-1.5 rounded-full bg-slate-400" />
                Desconectado
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Info Notification Area */}
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl p-4 flex items-start space-x-3 shadow-xs transition-colors">
          <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
            <span className="font-bold">Como funciona?</span> Conecte o seu WhatsApp Web lendo o QR Code abaixo. Uma vez conectado, selecione o <span className="font-semibold text-emerald-950 dark:text-emerald-100">Grupo Mestre</span> (de onde as mensagens serão lidas) e adicione um ou mais <span className="font-semibold text-emerald-950 dark:text-emerald-100">Grupos de Destino</span> (para onde elas serão enviadas). Todo texto recebido será instantaneamente repassado!
          </div>
        </div>


        {/* Dynamic Auth Row - QR Code / Welcome */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* LEFT: QR Code Scan Screen (If Disconnected) */}
          {state.status !== 'connected' && (
            <div className="lg:col-span-12">
              <div id="qr-panel" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 lg:p-12 shadow-sm text-center max-w-2xl mx-auto transition-colors">
                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-slate-100 tracking-tight mb-2">
                  Conecte seu WhatsApp Web
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                  Escaneie o código QR abaixo diretamente no aplicativo de seu smartphone para autenticar a sessão do robô integrador.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                  {/* QR Image Holder */}
                  <div className="relative p-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl shrink-0 transition-colors">
                    {state.qr ? (
                      <div className="relative">
                        <img 
                          id="qr-image"
                          src={state.qr} 
                          alt="WhatsApp QR Code" 
                          referrerPolicy="no-referrer"
                          className="w-56 h-56 rounded-xl relative z-1 gap-2" 
                        />
                        <div className="absolute inset-0 border border-dashed border-emerald-400 rounded-xl animate-pulse pointer-events-none" />
                      </div>
                    ) : (
                      <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700 transition-colors">
                        <QrCode className="w-12 h-12 mb-3 animate-pulse text-emerald-500/80" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gerando código QR...</span>
                        <span className="text-[10px] text-slate-400 mt-1">Aguarde alguns segundos</span>
                      </div>
                    )}
                  </div>

                  {/* QR Setup Steps */}
                  <div className="text-left max-w-sm">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-wide uppercase">
                      Instruções de Escaneamento
                    </h3>
                    <ol className="space-y-4 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <li className="flex items-start">
                        <span className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg w-6 h-6 text-xs mr-3 shrink-0 mt-0.5">1</span>
                        <span>Abra o <strong className="text-slate-800 dark:text-slate-100">WhatsApp</strong> no celular.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg w-6 h-6 text-xs mr-3 shrink-0 mt-0.5">2</span>
                        <span>Acesse <strong className="text-slate-800 dark:text-slate-100">Menu</strong> ou <strong className="text-slate-800 dark:text-slate-100">Ajustes</strong> e escolha <strong className="text-slate-800 dark:text-slate-100">Aparelhos Conectados</strong>.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg w-6 h-6 text-xs mr-3 shrink-0 mt-0.5">3</span>
                        <span>Toque em <strong className="text-slate-800 dark:text-slate-100">Conectar um aparelho</strong> e aponte a câmera para esta tela.</span>
                      </li>
                    </ol>

                    <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 text-xs rounded-xl flex items-start space-x-2 transition-colors">
                      <AlertCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>Após a leitura, a conexão será estabelecida automaticamente e seus grupos de conversa serão carregados.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE WORKSPACE: (When WhatsApp is Connected) */}
          {state.status === 'connected' && (
            <>
              {/* Navigation Tabs */}
              <div className="lg:col-span-12 mb-2">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-md ml-0 shadow-inner">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                      activeTab === 'dashboard'
                        ? 'bg-white dark:bg-slate-700 shadow flex items-center justify-center text-slate-800 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('affiliates')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                      activeTab === 'affiliates'
                        ? 'bg-white dark:bg-slate-700 shadow flex items-center justify-center text-slate-800 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Afiliados
                  </button>
                  <button
                    onClick={() => setActiveTab('deals')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                      activeTab === 'deals'
                        ? 'bg-white dark:bg-slate-700 shadow flex items-center justify-center text-slate-800 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    🔥 Super Ofertas
                  </button>
                </div>
              </div>

              {activeTab === 'dashboard' ? (
                <>
                  {/* LEFT COLUMN: Setup groups */}
                  <div className="lg:col-span-7 space-y-8">
                    
                    {/* Configuration Section Card */}
                    <div id="setup-panel" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 lg:p-8 shadow-xs transition-colors">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Configuração de Redirecionamento</h2>
                    </div>
                    {/* Refresh groups button */}
                    <button
                      id="btn-refresh"
                      onClick={handleRefreshGroups}
                      disabled={isRefreshing}
                      className="inline-flex items-center px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Sincronizar Grupos
                    </button>
                  </div>

                  {/* Available Group Search Filter to find groups easily */}
                  <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-colors">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Filtro de busca rápida de grupos</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 lowercase bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full font-medium">
                        {state.availableGroups.length} grupos carregados
                      </span>
                    </label>
                    <div className="relative">
                      <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input 
                        type="text"
                        placeholder="Busque pelo nome do grupo de WhatsApp..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Master Group Dropdown Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span>1. Grupo Mestre (Origem)</span>
                      </label>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 font-medium">
                        O monitor estará ouvindo e capturando mensagens exclusivamente deste grupo.
                      </p>

                      <div className="flex gap-2">
                        <select
                          id="select-master"
                          value={selectedMasterId}
                          onChange={(e) => {
                            setSelectedMasterId(e.target.value);
                            handleSetMasterGroup(e.target.value);
                          }}
                          className="form-select flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition-all font-medium"
                        >
                          <option value="">-- Selecione o Grupo Mestre --</option>
                          {filteredAvailableForMaster.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Display Selected Master Group */}
                      {state.masterGroup ? (
                        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-sm rounded-xl flex items-center justify-between font-medium transition-colors">
                          <div className="flex items-center space-x-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
                            <span className="truncate">Escutando ativamente: <strong>{state.masterGroup.name}</strong></span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/50 px-2 py-0.5 rounded-md text-right shrink-0 transition-colors">
                            ID do canal: {state.masterGroup.id.split('@')[0]}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-red-800 dark:text-red-300 text-xs rounded-xl flex items-center space-x-1.5 font-medium transition-colors">
                          <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                          <span>Status: Nenhum grupo registrado como mestre. Defina um para começar.</span>
                        </div>
                      )}
                    </div>

                    {/* Target Groups List and Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                        <span>2. Grupos de Destino (Reencaminhamento)</span>
                      </label>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 font-medium">
                        Qualquer mensagem capturada no grupo mestre será automaticamente encaminhada para essa lista de grupos.
                      </p>

                      <div className="flex gap-2 mb-4">
                        <select
                          id="select-target"
                          value={selectedTargetId}
                          onChange={(e) => {
                            setSelectedTargetId(e.target.value);
                          }}
                          className="form-select flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 font-medium transition-colors"
                        >
                          <option value="">-- Escolha um grupo para adicionar --</option>
                          {filteredAvailableForTarget.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        <button
                          id="btn-add-target"
                          onClick={() => handleAddTargetGroup(selectedTargetId)}
                          disabled={!selectedTargetId}
                          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:dark:bg-slate-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white disabled:text-slate-400 disabled:dark:text-slate-500 px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer disabled:cursor-not-allowed transition-colors"
                        >
                          Adicionar
                        </button>
                      </div>

                      {/* Display registered targets */}
                      {state.targetGroups.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {state.targetGroups.map((tg) => (
                            <div 
                              key={tg.id} 
                              className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-sm transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs group font-medium"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tg.name}</span>
                              </div>
                              <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                <span>{tg.id.split('@')[0]}</span>
                                <button
                                  onClick={() => handleRemoveTargetGroup(tg.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors pointer-events-auto cursor-pointer"
                                  title="Remover grupo de destino"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-xl flex items-center space-x-1.5 font-medium transition-colors">
                          <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>Nenhum grupo de destino cadastrado na fila de redirecionamento.</span>
                        </div>
                      )}
                    </div>

                    {/* Message Prefixes Control Option */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
                      <div className="pr-4">
                        <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                          Identificação de Origem nas Mensagens
                        </label>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          Insere cabeçalho personalizado na mensagem indicando o autor original. Ex: <i>*[Mestre - Remetente]:*</i>
                        </span>
                      </div>
                      <div>
                        <button
                          id="toggle-prefix"
                          onClick={() => handleTogglePrefix(!state.includeSenderPrefix)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            state.includeSenderPrefix ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              state.includeSenderPrefix ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Delay / Anti-Ban Option */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="pr-4">
                          <label className="text-sm font-bold text-slate-800 dark:text-white block">
                            Intervalo de Envio (Anti-Ban)
                          </label>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-relaxed block mt-0.5">
                            Tempo em segundos que o robô aguarda antes de encaminhar cada mensagem consecutiva. Mínimo permitido de <strong>5 segundos</strong> por segurança.
                          </span>
                        </div>
                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-xl shrink-0 font-mono">
                          {state.forwardDelayMs / 1000}s
                        </span>
                      </div>
                      <div className="mt-3">
                        <input
                          type="range"
                          min="5"
                          max="20"
                          step="1"
                          value={state.forwardDelayMs / 1000}
                          onChange={(e) => handleUpdateDelay(Number(e.target.value) * 1000)}
                          className="w-full accent-emerald-500 h-2 bg-slate-100 dark:bg-slate-700 rounded-lg cursor-pointer appearance-none transition-colors"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 px-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400">5s (Mínimo / Seguro)</span>
                          <span>10s</span>
                          <span>15s</span>
                          <span>20s (Altamente Seguro)</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

                {/* RIGHT COLUMN: Real-time forwarding logs */}
                <div className="lg:col-span-5 space-y-8">
                
                {/* Statistics panel */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm overflow-hidden relative">
                  <div className="absolute right-0 bottom-0 translate-y-3 translate-x-3 text-slate-800 opacity-20 pointer-events-none">
                    <MessageSquare className="w-32 h-32" />
                  </div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4">Vantagens & Métricas</h3>
                  <div className="grid grid-cols-2 gap-4 relative z-1 font-sans">
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                      <span className="text-2xl font-extrabold text-white block">
                        {state.logs.length}
                      </span>
                      <span className="text-xs text-slate-300 font-medium">
                        Redirecionamentos
                      </span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                      <span className="text-2xl font-extrabold text-white block">
                        {state.targetGroups.length}
                      </span>
                      <span className="text-xs text-slate-300 font-medium">
                        Grupos de Destino
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>Estado do Robô:</span>
                    <span className="inline-flex items-center text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping" />
                      Ativo & Ouvindo
                    </span>
                  </div>
                </div>

                    {/* Log screen */}
                <div id="logs-panel" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs flex flex-col h-112 transition-colors">
                  <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Histórico de Mensagens</h2>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md font-semibold font-mono transition-colors">
                      Filtrar: últimos 100
                    </span>
                  </div>

                  {/* Logs Scroller */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    {state.logs.length > 0 ? (
                      state.logs.map((log) => (
                        <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl text-xs space-y-2.5 transition hover:bg-slate-100/50 dark:hover:bg-slate-800">
                          
                          {/* Log Meta */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              {log.masterGroupName && (
                                <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider text-[9px]">
                                  Mestre: {log.masterGroupName}
                                </span>
                              )}
                              <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200/55 dark:border-slate-600/50 px-2 py-0.5 rounded-md font-bold">
                                De: {log.senderName}
                              </span>
                            </div>
                            <span>
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>

                          {/* Message Body */}
                          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-600 p-2.5 rounded-xl text-slate-700 dark:text-slate-300 select-all font-mono break-all whitespace-pre-wrap shadow-inner leading-relaxed transition-colors">
                            {log.text}
                          </div>
                          
                          {/* Original Text Warning */}
                          {log.originalText && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                Texto Original (com tags alteradas):
                              </span>
                              <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-400 text-[10px] font-mono break-all whitespace-pre-wrap opacity-80">
                                {log.originalText}
                              </div>
                            </div>
                          )}

                          {/* Target Forward Status Checklist */}
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 transition-colors">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                              Caminho de Envio:
                            </span>
                            <div className="grid grid-cols-1 gap-1">
                              {log.targets.map((tgt, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-400 transition-colors">
                                  <span className="truncate max-w-xs">{tgt.targetName}</span>
                                  {tgt.status === 'success' ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                                      <Check className="w-3 h-3 mr-0.5 shrink-0" />
                                      Enviado
                                    </span>
                                  ) : (
                                    <span 
                                      className="text-red-500 dark:text-red-400 font-bold flex items-center" 
                                      title={tgt.error || 'Erro'}
                                    >
                                      ❌ Erro
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-12 transition-colors">
                        <MessageSquare className="w-10 h-10 mb-2 opacity-35 text-slate-500 dark:text-slate-600" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-500">Nenhuma mensagem registrada.</span>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 max-w-xs text-center leading-normal">
                          Qualquer conversa enviada no Grupo Mestre aparecerá reencaminhada aqui em lote.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              </>
              ) : activeTab === 'affiliates' ? (
                <div className="lg:col-span-12 space-y-8">
                  <AffiliateConfigurator initialConfig={state.affiliateConfig} onSave={handleSaveAffiliateConfig} />
                </div>
              ) : (
                <div className="lg:col-span-12">
                  <DealsViewer 
                    affiliateConfig={state.affiliateConfig}
                    targetGroups={state.targetGroups}
                    isWhatsAppConnected={state.status === 'connected'}
                  />
                </div>
              )}
            </>
          )}

        </div>

      </main>
    </div>
  );
}

// Simple layout icons fallback if not standard import
function FileText(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || "16"}
      height={props.size || "16"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}
