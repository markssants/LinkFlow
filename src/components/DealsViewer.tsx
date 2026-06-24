import React, { useState, useEffect } from 'react';
import { ShoppingBag, ShoppingCart, RefreshCw, Send, Search, CheckCircle, AlertCircle, ExternalLink, Sparkles, Copy, Share2 } from 'lucide-react';
import { AffiliateConfig, Group } from '../types';

interface Deal {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  image: string;
  url: string;
  from: 'Amazon' | 'AliExpress' | 'Magazine Luiza' | 'Shopee' | 'Mercado Livre';
  freeShipping?: boolean;
  installments?: string;
  description?: string;
}

interface DealsViewerProps {
  affiliateConfig?: AffiliateConfig;
  targetGroups: Group[];
  isWhatsAppConnected: boolean;
}

// Brand Logos
function MercadoLivreLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FFE600" />
      <path d="M7 13.5c1-1.5 3-2.5 5-2.5s4 1 5 2.5m-8-5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm6 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke="#2D3277" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AmazonLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#131921" />
      <path d="M7 15c2.5 2 7.5 2 10 0" stroke="#FF9900" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 13.5l1.5 1.5l1.5-2.5" stroke="#FF9900" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AliExpressLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FD3813" />
      <path d="M12 6L7 11.5h10L12 6z" fill="white" />
      <path d="M6 14.5C6 12 8 11.5 12 11.5s6 .5 6 3s-2.5 3.5-6 3.5s-6-1-6-3.5z" stroke="white" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function MagaluLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#0086FF" />
      <path d="M6.5 15.5V9.5C6.5 8.5 7.33 8 8 8c.7 0 1.5.5 1.5 1.5v6M9.5 15.5V9.5C9.5 8.5 10.33 8 11 8c.7 0 1.5.5 1.5 1.5v6M12.5 15.5V9.5c0-1 .83-1.5 1.5-1.5c.7 0 1.5.5 1.5 1.5v6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShopeeLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#EE4D2D" />
      <path d="M9 9C9 7.34 10.34 6 12 6C13.66 6 15 7.34 15 9" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.5 9H17.5C17.78 9 18 11 17.8 15.5C17.65 18 16.5 19 12 19C7.5 19 6.35 18 6.2 15.5C6 11 6.22 9 6.5 9Z" fill="white" />
      <path d="M11.5 11.5c-.8 0-1.2.4-1.2.8c0 .8 1.5 1 1.5 1.9c0 .7-.6 1.1-1.3 1.1c-.6 0-1.1-.3-1.1-.8h-.8c0 .9.8 1.5 1.9 1.5c1.1 0 2.1-.6 2.1-1.8c0-.9-1.4-1.2-1.4-1.8c0-.4.4-.7.9-.7c.5 0 .9.3.9.7h.8c0-.8-.8-1.5-1.7-1.5z" fill="#EE4D2D" />
    </svg>
  );
}

const CATEGORIES = [
  { id: 'geral', label: '🔥 Geral/Super Ofertas' },
  { id: 'smartphones', label: '📱 Celulares & Smartphones' },
  { id: 'informatica', label: '💻 Informática & Notebooks' },
  { id: 'games', label: '🎮 Games & Consoles' },
  { id: 'casa', label: '🏠 Casa & Eletros' }
];

export default function DealsViewer({ affiliateConfig, targetGroups, isWhatsAppConnected }: DealsViewerProps) {
  const [activePlatform, setActivePlatform] = useState<'amazon' | 'aliexpress' | 'magazineluiza' | 'shopee' | 'mercadolivre'>('amazon');
  const [activeCategory, setActiveCategory] = useState<string>('geral');
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);

  // States for the Broadcasting Modal
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [shareText, setShareText] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDeals = async (searchOverride?: string, forceCategory?: string, forcePlatform?: 'amazon' | 'aliexpress' | 'magazineluiza' | 'shopee') => {
    setLoading(true);
    setError(null);
    try {
      const q = searchOverride !== undefined ? searchOverride : customSearchQuery;
      const finalPlatform = forcePlatform || activePlatform;
      const finalCategory = forceCategory || activeCategory;

      const params = new URLSearchParams({
        platform: finalPlatform,
        category: q ? 'search' : finalCategory,
        ...(q && { q })
      });

      const response = await fetch(`/api/deals?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setDeals(data.deals || []);
        setHasFetched(true);
      } else {
        setError(data.error || 'Erro ao carregar as ofertas.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor de ofertas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSearchQuery.trim()) {
      setIsSearching(true);
      fetchDeals(customSearchQuery.trim());
    }
  };

  const handleClearSearch = () => {
    setCustomSearchQuery('');
    setIsSearching(false);
    setDeals([]);
    setHasFetched(false);
  };

  const handleCopyLink = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const openBroadcastModal = (deal: Deal) => {
    setSelectedDeal(deal);
    setBroadcastResult(null);

    // Build a shiny affiliate marketing message
    const formattedPrice = deal.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedOriginalPrice = deal.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const discountStr = deal.discountPercentage > 0 ? `*(${deal.discountPercentage}% de DESCONTO)*` : '';
    const freeShippingStr = deal.freeShipping ? '🚀 *FRETE GRÁTIS!*' : '';
    const platformLabel = 
      deal.from === 'Amazon' ? 'Amazon 📦' :
      deal.from === 'AliExpress' ? 'AliExpress 🔴' :
      deal.from === 'Magazine Luiza' ? 'Magazine Luiza ⚡' :
      'Shopee 🧡';

    const text = `🔥 *OFERTA IMPERDÍVEL NO ${platformLabel}!* 🔥\n\n*${deal.title}*\n\n${deal.description || ''}\n\n❌ De: ~${formattedOriginalPrice}~\n✅ *Por apenas: ${formattedPrice}* ${discountStr}\n${freeShippingStr && freeShippingStr + '\n'}${deal.installments ? `💳 ${deal.installments}\n` : ''}\n👇 *Garanta o seu com desconto seguro aqui:*\n${deal.url}`;
    
    setShareText(text);
  };

  const handleBroadcast = async () => {
    if (!shareText.trim()) return;
    setIsBroadcasting(true);
    setBroadcastResult(null);
    try {
      const response = await fetch('/api/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: shareText })
      });
      const data = await response.json();
      if (data.success) {
        setBroadcastResult({
          success: true,
          message: `Oferta enviada com sucesso para ${data.sentCount} grupo(s) de destino!`
        });
      } else {
        setBroadcastResult({
          success: false,
          message: data.error || 'Falha ao enviar a oferta para os grupos.'
        });
      }
    } catch (err) {
      console.error(err);
      setBroadcastResult({
        success: false,
        message: 'Erro ao se conectar com o serviço de disparos.'
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-slate-500/10 dark:from-slate-800/60 dark:to-slate-800/40 border border-slate-200/50 dark:border-slate-700/60 rounded-3xl">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/25 animate-pulse" />
            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/30">
              100% Real-Time
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Monitor de Ofertas Ativas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Busque descontos reais na Amazon, AliExpress, Magalu e Shopee. Seus links de afiliado são aplicados automaticamente!
          </p>
        </div>

        <button 
          onClick={() => fetchDeals()}
          disabled={loading}
          className="flex items-center justify-center space-x-1.5 self-start md:self-center px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Ofertas</span>
        </button>
      </div>

      {/* Main Control Card */}
      <div className="p-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-6">
        
        {/* Row 1: Platform Selection and Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between pb-2">
          
          {/* Custom Platform Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-5 bg-slate-100 dark:bg-slate-900 p-1.5 gap-1.5 rounded-2xl w-full max-w-2xl border border-slate-200/40 dark:border-slate-800">
            <button
              onClick={() => {
                setActivePlatform('amazon');
                setDeals([]);
                setHasFetched(false);
                setCustomSearchQuery('');
                setIsSearching(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                activePlatform === 'amazon'
                  ? 'bg-[#FF9900] text-[#131921] shadow-sm border border-orange-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <AmazonLogo className="w-4 h-4 shrink-0" />
              <span>Amazon</span>
            </button>
            <button
              onClick={() => {
                setActivePlatform('aliexpress');
                setDeals([]);
                setHasFetched(false);
                setCustomSearchQuery('');
                setIsSearching(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                activePlatform === 'aliexpress'
                  ? 'bg-[#FD3813] text-white shadow-sm border border-[#FD3813]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <AliExpressLogo className="w-4 h-4 shrink-0" />
              <span>AliExpress</span>
            </button>
            <button
              onClick={() => {
                setActivePlatform('magazineluiza');
                setDeals([]);
                setHasFetched(false);
                setCustomSearchQuery('');
                setIsSearching(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 text-xs font-bold rounded-xl transition shrink-0 ${
                activePlatform === 'magazineluiza'
                  ? 'bg-[#0086FF] text-white shadow-sm border border-[#0086FF]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <MagaluLogo className="w-4 h-4 shrink-0" />
              <span>Magalu</span>
            </button>
            <button
              onClick={() => {
                setActivePlatform('shopee');
                setDeals([]);
                setHasFetched(false);
                setCustomSearchQuery('');
                setIsSearching(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                activePlatform === 'shopee'
                  ? 'bg-[#EE4D2D] text-white shadow-sm border border-[#EE4D2D]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <ShopeeLogo className="w-4 h-4 shrink-0" />
              <span>Shopee Br</span>
            </button>
            <button
              onClick={() => {
                setActivePlatform('mercadolivre');
                setDeals([]);
                setHasFetched(false);
                setCustomSearchQuery('');
                setIsSearching(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                activePlatform === 'mercadolivre'
                  ? 'bg-[#FFE600] text-[#2D3277] shadow-sm border border-yellow-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <MercadoLivreLogo className="w-4 h-4 shrink-0" />
              <span>M. Livre</span>
            </button>
          </div>

          {/* Real-time search engine */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2 relative">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`O que deseja buscar na ${
                  activePlatform === 'amazon' ? 'Amazon' :
                  activePlatform === 'aliexpress' ? 'AliExpress' :
                  activePlatform === 'magazineluiza' ? 'Magalu' :
                  activePlatform === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'
                } hoje?`}
                value={customSearchQuery}
                onChange={(e) => setCustomSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-900 dark:text-slate-100 outline-hidden focus:border-blue-500/55 dark:focus:border-blue-500/55 transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs"
            >
              Buscar
            </button>
            {isSearching && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                Limpar
              </button>
            )}
          </form>

        </div>

        {/* Row 2: Category Filters */}
        {!isSearching && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 -mx-2 px-2 gap-y-1.5 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setDeals([]);
                  setHasFetched(false);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 border uppercase tracking-wider ${
                  activeCategory === cat.id
                    ? activePlatform === 'amazon'
                      ? 'bg-[#FF9900] text-[#131921] border-orange-400 shadow-sm'
                      : activePlatform === 'aliexpress'
                      ? 'bg-[#FD3813] text-white border-[#FD3813] shadow-sm'
                      : activePlatform === 'magazineluiza'
                      ? 'bg-[#0086FF] text-white border-[#0086FF] shadow-sm'
                      : activePlatform === 'mercadolivre'
                      ? 'bg-[#FFE600] text-[#2D3277] border-yellow-400 shadow-sm font-extrabold'
                      : 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Errors or Loading */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200/55 dark:border-red-900/35 rounded-2xl flex items-start space-x-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="text-xs font-semibold">
            <p className="font-bold">Houve um problema:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold tracking-wider animate-pulse uppercase text-center">
            {
              activePlatform === 'amazon' ? 'Buscando ofertas reais na Amazon via IA...' :
              activePlatform === 'aliexpress' ? 'Garimpando descontos incríveis no AliExpress...' :
              activePlatform === 'magazineluiza' ? 'Consultando ofertas verídicas no Magazine Luiza...' :
              activePlatform === 'mercadolivre' ? 'Carregando ofertas REAIS e ativas do Mercado Livre via API oficial...' :
              'Acionando IA Inteligente para buscar ofertas reais da Shopee...'
            }
          </div>
        </div>
      ) : (
        <>
          {!hasFetched ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-4 max-w-2xl mx-auto flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800/80 rounded-full flex items-center justify-center text-blue-500 shadow-inner">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Pronto para buscar ofertas ativas!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed text-center">
                  As ofertas do/da {
                    activePlatform === 'amazon' ? 'Amazon 📦' :
                    activePlatform === 'aliexpress' ? 'AliExpress 🔴' :
                    activePlatform === 'magazineluiza' ? 'Magazine Luiza ⚡' :
                    activePlatform === 'mercadolivre' ? 'Mercado Livre 🤝 (100% Real - Sem IA)' :
                    'Shopee Brasil 🧡'
                  } para a categoria selecionada serão buscadas de forma verídica ao clicar no botão de atualização abaixo.
                </p>
              </div>
              <button 
                onClick={() => fetchDeals()}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-6 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition duration-150 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar Ofertas</span>
              </button>
            </div>
          ) : deals.length === 0 && !error ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-2">
              <p className="text-slate-400 dark:text-slate-500 font-bold">Nenhuma oferta encontrada.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tente atualizar, escolher outra categoria ou realizar uma busca personalizada acima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((deal, idx) => {
                const discount = deal.discountPercentage;
                return (
                  <div 
                    key={deal.id || idx} 
                    className="group relative flex flex-col bg-white dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xs hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-md transitionduration-300"
                  >
                    {/* Floating Discount Tag */}
                    {discount > 0 && (
                      <span className="absolute top-3.5 left-3.5 z-10 bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                        -{discount}% OFF
                      </span>
                    )}

                    {/* Image Area Container */}
                    <div className="relative w-full h-44 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center p-4 border-b border-slate-100 dark:border-slate-700/50">
                      {deal.image ? (
                        <img 
                          src={deal.image} 
                          alt={deal.title} 
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain transform group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-slate-350 dark:text-slate-500">
                          <ShoppingBag className="w-10 h-10" />
                          <span className="text-[10px] uppercase font-bold mt-2">Sem imagem</span>
                        </div>
                      )}
                    </div>

                    {/* content specs */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      
                      <div className="space-y-2">
                        {/* Platform Header */}
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center space-x-1.5">
                            {deal.from === 'Amazon' ? (
                              <AmazonLogo className="w-3.5 h-3.5" />
                            ) : deal.from === 'AliExpress' ? (
                              <AliExpressLogo className="w-3.5 h-3.5" />
                            ) : deal.from === 'Magazine Luiza' ? (
                              <MagaluLogo className="w-3.5 h-3.5" />
                            ) : deal.from === 'Mercado Livre' ? (
                              <MercadoLivreLogo className="w-3.5 h-3.5" />
                            ) : (
                              <ShopeeLogo className="w-3.5 h-3.5" />
                            )}
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">
                              {deal.from}
                            </span>
                          </div>
                          {deal.freeShipping && (
                            <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[9px]">
                              Frete Grátis
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" title={deal.title}>
                          {deal.title}
                        </h3>

                        {deal.description && (
                          <p className="line-clamp-2 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                            {deal.description}
                          </p>
                        )}
                      </div>

                      {/* Pricing Specs */}
                      <div className="pt-2 border-t border-slate-50 dark:border-slate-700/40">
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-slate-400 dark:text-slate-500 line-through text-[10px] font-semibold">
                            {deal.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-slate-900 dark:text-slate-50 text-base font-extrabold">
                            {deal.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        {deal.installments && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {deal.installments}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons & Links */}
                      <div className="flex flex-col space-y-2 text-xs">
                        {/* Open in New Tab Button */}
                        <a
                          href={deal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center space-x-2 py-2.5 px-4 font-bold rounded-xl transition duration-200 shadow-xs text-center border ${
                            deal.from === 'Amazon'
                              ? 'bg-[#FF9900]/10 hover:bg-[#FF9900]/20 text-[#D47F00] dark:text-amber-400 border-[#FF9900]/20'
                              : deal.from === 'AliExpress'
                              ? 'bg-[#FD3813]/10 hover:bg-[#FD3813]/25 text-[#E02602] dark:text-red-400 border-[#FD3813]/20'
                              : deal.from === 'Magazine Luiza'
                              ? 'bg-[#0086FF]/10 hover:bg-[#0086FF]/25 text-[#0070D6] dark:text-blue-400 border-[#0086FF]/20'
                              : deal.from === 'Mercado Livre'
                              ? 'bg-[#FFE600]/15 hover:bg-[#FFE600]/30 text-[#001D85] dark:text-yellow-300 border-[#FFE600]/25'
                              : 'bg-[#EE4D2D]/10 hover:bg-[#EE4D2D]/25 text-[#D1381B] dark:text-orange-400 border-[#EE4D2D]/20'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir Oferta</span>
                        </a>

                        {/* Buttons Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleCopyLink(deal.url, idx)}
                            className="flex items-center justify-center space-x-1 py-1.5 font-bold text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openBroadcastModal(deal)}
                            className="flex items-center justify-center space-x-1 py-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Enviar Zap</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Share / Broadcast Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl w-full max-w-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Disparar Oferta nos Grupos de Target</h3>
              </div>
              <button 
                onClick={() => { setSelectedDeal(null); setBroadcastResult(null); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
              >
                Voltar
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1 uppercase tracking-wider text-[9px]">Anunciando para Grupos</span>
                O robô de mensagens enviará a mensagem formatada abaixo para todos os seus {targetGroups.length} grupos de destino ativos. Seus links de afiliado já estão embutidos.
              </div>

              {/* Editable Text Area for the Deal Message */}
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[9px]">Personalizar Mensagem:</label>
                <textarea
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  rows={10}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-800 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500/60"
                />
              </div>

              {/* Status or Results */}
              {broadcastResult && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  broadcastResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30'
                    : 'bg-red-50 dark:bg-red-950/15 text-red-800 dark:text-red-400 border-red-250 dark:border-red-900/30'
                }`}>
                  {broadcastResult.success ? (
                    <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  )}
                  <div className="text-[11px]">
                    <p className="font-bold">{broadcastResult.success ? 'Disparo Realizado!' : 'Falha no Envio:'}</p>
                    <p>{broadcastResult.message}</p>
                  </div>
                </div>
              )}

              {/* Action and controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px]">
                  {!isWhatsAppConnected && (
                    <span className="text-red-600 dark:text-red-400 font-bold">⚠️ Conecte o WhatsApp no Dashboard</span>
                  )}
                  {isWhatsAppConnected && targetGroups.length === 0 && (
                    <span className="text-red-600 dark:text-red-400 font-bold">⚠️ Configure Grupos de Destino</span>
                  )}
                  {isWhatsAppConnected && targetGroups.length > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">● WhatsApp Conectado ({targetGroups.length} grupos)</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedDeal(null); setBroadcastResult(null); }}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || !isWhatsAppConnected || targetGroups.length === 0}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {isBroadcasting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Disparar nos Grupos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
