import React, { useState, useEffect } from 'react';
import { Link, Save } from 'lucide-react';
import { AffiliateConfig } from '../types';

// Real corporate brand logo components
function AmazonLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.4 4c-3.1 0-5.6 1.4-5.6 4.2 0 .1.1.2.2.2h2.2c.1 0 .2-.1.2-.2.1-1.3.8-1.9 2-1.9 1 0 1.6.4 1.6 1.1v.6C12 8.3 10 8.5 8.3 9.4c-1.8.9-2.7 2.4-2.7 4.3 0 2.5 1.8 3.9 4.3 3.9 1.8 0 3.3-.9 4-2.3.1-.1.2-.1.2 0 .5.7 1.3 1.3 2.5 1.3.1 0 .2-.1.2-.2v-2c0-.1 0-.1-.1-.2-.6-.1-1-.4-1-1.4V8.1c0-2.7-1.8-4.1-4.8-4.1M13 13.8c-.5 1-1.4 1.6-2.5 1.6-1.5 0-2.3-.9-2.3-2.2 0-1.6 1-2.4 2.8-2.4H13v3z" fill="currentColor" />
      <path d="M3.7 19c4.2 2.2 9.4 3 14.5 1.6 2.3-.6 4.3-1.9 5.3-3.5.2-.3-.1-.6-.4-.4-1.3.8-3.1 1.4-4.8 1.7-4 .7-8.2.1-12.1-1.8-.3-.2-.6.1-.5.4z" fill="#FF9900" />
      <path d="M22.8 15.6c-.3-.2-.8-.4-1.3-.4-.5 0-1 .1-1.4.3-.3.1-.2.5.1.4.5-.2 1.1-.3 1.6-.2l-1.3 1.7c-.2.2 0 .5.2.3l2.2-2c.1-.1 0-.1-.1-.1z" fill="#FF9900" />
    </svg>
  );
}

function MagaluLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="magaluGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#0052FF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#magaluGradient)" />
      <path d="M5.5 16.5H7.5V11C7.5 9.6 8.4 8.7 9.5 8.7C10.6 8.7 11.3 9.6 11.3 11V16.5H13.3V11C13.3 9.6 14.2 8.7 15.3 8.7C16.4 8.7 17.1 9.6 17.1 11V16.5H19.1V10.5C19.1 8.3 17.5 6.7 15.5 6.7C14.1 6.7 12.9 7.6 12.3 8.8C11.7 7.6 10.5 6.7 9.1 6.7C7.4 6.7 6 8.1 5.5 10.1V16.5Z" fill="white" />
    </svg>
  );
}

function MercadoLivreLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FFE600" />
      <path d="M6 13.5c0 0 1-2.5 3.5-2.5 1.5 0 2.5.8 3.5.4 1-.4 2-1.6 2.5-.8s-1.2 2-2 2.4c-.8.4-1.6 0-2.4.8C10.3 14.6 9.5 15 8.3 15C7.1 15 6 13.5 6 13.5z" stroke="#2D3277" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 10.5c0 0-.8 2.5-3.3 2.5-1.3 0-2.1-.8-2.9-.4-.8.4-1.7 1.6-2.1.8s1-1.7 1.8-2.1c.8-.4 1.5 0 2.2-.8C12 9.7 12.7 9.3 13.7 9.3c1 0 1.8 1.2 1.8 1.2z" stroke="#2D3277" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AliExpressLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#E62E04" />
      <path d="M12 5c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="white" />
      <path d="M14.5 11c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm-5 0c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm2.5 4c1.66 0 3-1.34 3-3H9c0 1.66 1.34 3 3 3z" fill="white" />
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

interface AffiliateConfiguratorProps {
  initialConfig?: AffiliateConfig;
  onSave: (config: AffiliateConfig) => Promise<void>;
}

export function AffiliateConfigurator({ initialConfig, onSave }: AffiliateConfiguratorProps) {
  const [config, setConfig] = useState<AffiliateConfig>(() => {
    const base = {
      mercadoLivre: '',
      shopee: '',
      amazon: '',
      magazineLuiza: '',
      aliexpress: '',
      manualLinks: {
        mercadoLivre: '',
        shopee: '',
        amazon: '',
        magazineLuiza: '',
        aliexpress: ''
      },
      useManualLinks: {
        mercadoLivre: false,
        shopee: false,
        amazon: false,
        magazineLuiza: false,
        aliexpress: false
      }
    };
    if (!initialConfig) return base;
    return {
      ...base,
      ...initialConfig,
      manualLinks: {
        ...base.manualLinks,
        ...(initialConfig.manualLinks || {})
      },
      useManualLinks: {
        ...base.useManualLinks,
        ...((initialConfig.useManualLinks as any) || {})
      }
    };
  });
  const [saving, setSaving] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  useEffect(() => {
    if (initialConfig && !hasUserEdited) {
      // Deep merge to ensure nested objects exist
      setConfig((prev) => ({ 
        ...prev, 
        ...initialConfig,
        manualLinks: {
          ...(prev.manualLinks || {}),
          ...(initialConfig.manualLinks || {})
        },
        useManualLinks: {
          ...(prev.useManualLinks || {}),
          ...(initialConfig.useManualLinks || {})
        }
      }) as AffiliateConfig);
    }
  }, [initialConfig, hasUserEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(config);
    setSaving(false);
    setHasUserEdited(false); // Reset so it can receive new background server state if needed
  };

  const handleChange = (key: keyof AffiliateConfig, value: string) => {
    setHasUserEdited(true);
    setConfig({ ...config, [key]: value });
  };

  const handleManualLinkChange = (key: keyof NonNullable<AffiliateConfig['manualLinks']>, value: string) => {
    setHasUserEdited(true);
    setConfig({
      ...config,
      manualLinks: {
        ...(config.manualLinks || { mercadoLivre: '', shopee: '', amazon: '', magazineLuiza: '', aliexpress: '' }),
        [key]: value
      }
    });
  };

  const platforms = [
    { 
      key: 'aliexpress' as const, 
      label: 'AliExpress', 
      icon: AliExpressLogo,
      iconColor: 'bg-white border-slate-200/50 dark:bg-slate-900 shadow-xs',
      dynamicLabel: 'ID de Afiliado', 
      dynamicDesc: 'Aplicado em links de produtos', 
      dynamicPlaceholder: 'Ex: trackingId', 
      manualLabel: 'Link da Plataforma', 
      manualDesc: 'Substitui Link da Plataforma', 
      manualPlaceholder: 'Ex: https://best.aliexpress.com/' 
    },
    { 
      key: 'amazon' as const, 
      label: 'Amazon', 
      icon: AmazonLogo,
      iconColor: 'bg-white border-slate-200/50 dark:bg-slate-900 shadow-xs text-slate-800 dark:text-slate-100',
      dynamicLabel: 'Tag de Afiliado', 
      dynamicDesc: 'Aplicado em links de produtos', 
      dynamicPlaceholder: 'Ex: seunome-20', 
      manualLabel: 'Link da Plataforma', 
      manualDesc: 'Substitui Link da Plataforma', 
      manualPlaceholder: 'Ex: https://amzn.to/' 
    },
    { 
      key: 'magazineLuiza' as const, 
      label: 'Magazine Luiza', 
      icon: MagaluLogo,
      iconColor: 'bg-white border-slate-200/50 dark:bg-slate-900 shadow-xs',
      dynamicLabel: 'Parceiro', 
      dynamicDesc: 'Aplicado em links de produtos', 
      dynamicPlaceholder: 'Ex: magalu', 
      manualLabel: 'Link da Plataforma', 
      manualDesc: 'Substitui Link da Plataforma', 
      manualPlaceholder: 'Ex: https://magalu.com/' 
    },
    { 
      key: 'mercadoLivre' as const, 
      label: 'Mercado Livre', 
      icon: MercadoLivreLogo,
      iconColor: 'bg-white border-slate-200/50 dark:bg-slate-900 shadow-xs',
      dynamicLabel: 'ID de Afiliado', 
      dynamicDesc: 'Aplicado em links de produtos', 
      dynamicPlaceholder: 'Ex: seu-id', 
      manualLabel: 'Link da Plataforma', 
      manualDesc: 'Substitui Link da Plataforma', 
      manualPlaceholder: 'Ex: https://meli.la/' 
    },
    { 
      key: 'shopee' as const, 
      label: 'Shopee', 
      icon: ShopeeLogo,
      iconColor: 'bg-white border-slate-200/50 dark:bg-slate-900 shadow-xs',
      dynamicLabel: 'ID de Afiliado', 
      dynamicDesc: 'Aplicado em links de produtos', 
      dynamicPlaceholder: 'Ex: 123456', 
      manualLabel: 'Link da Plataforma', 
      manualDesc: 'Substitui Link da Plataforma', 
      manualPlaceholder: 'Ex: https://shopee.com.br/' 
    }
  ];

  return (
    <div id="affiliate-panel" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 lg:p-8 shadow-xs transition-colors">
      <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
        <Link className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Troca de Link de Afiliado</h2>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Configure tags individuais, e o Link da Plataforma caso queira substituir mensagens que tenham apenas o link principal da loja, mantendo o tráfego com você.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {platforms.map(platform => (
            <div key={platform.key} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border flex items-center justify-center ${platform.iconColor}`}>
                    <platform.icon className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{platform.label}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{platform.dynamicLabel}</label>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Afiliado</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{platform.dynamicDesc}</p>
                <input
                  type="text"
                  placeholder={platform.dynamicPlaceholder}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm mt-1"
                  value={config[platform.key] || ''}
                  onChange={(e) => handleChange(platform.key, e.target.value)}
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{platform.manualLabel}</label>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Plataforma</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{platform.manualDesc}</p>
                <input
                  type="text"
                  placeholder={platform.manualPlaceholder}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mt-1"
                  value={config.manualLinks?.[platform.key] || ''}
                  onChange={(e) => handleManualLinkChange(platform.key, e.target.value)}
                />
              </div>

            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
