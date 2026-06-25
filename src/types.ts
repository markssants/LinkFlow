export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface Group {
  id: string;
  name: string;
}

export interface LogTarget {
  targetId: string;
  targetName: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface ForwardLog {
  id: string;
  timestamp: string;
  senderName: string;
  masterGroupName?: string;
  originalText?: string;
  text: string;
  targets: LogTarget[];
}

export interface AffiliateConfig {
  mercadoLivre: string;
  shopee: string;
  amazon: string;
  magazineLuiza: string;
  aliexpress?: string;
  manualLinks?: {
    mercadoLivre: string;
    shopee: string;
    amazon: string;
    magazineLuiza: string;
    aliexpress?: string;
  };
  useManualLinks?: {
    mercadoLivre: boolean;
    shopee: boolean;
    amazon: boolean;
    magazineLuiza: boolean;
    aliexpress?: boolean;
  };
}

export interface WhatsAppState {
  status: ConnectionStatus;
  qr: string | null;
  userInfo: { jid: string; name?: string } | null;
  isConnecting?: boolean;
  lastError?: string | null;
  lastQRTimestamp?: number;
  masterGroup: Group | null;
  targetGroups: Group[];
  availableGroups: Group[];
  logs: ForwardLog[];
  includeSenderPrefix: boolean;
  forwardDelayMs: number;
  cloudPersistenceEnabled: boolean;
  affiliateConfig?: AffiliateConfig;
}
