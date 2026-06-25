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
  text: string;
  targets: LogTarget[];
}

export interface WhatsAppState {
  status: ConnectionStatus;
  qr: string | null;
  userInfo: { jid: string; name?: string } | null;
  masterGroup: Group | null;
  targetGroups: Group[];
  availableGroups: Group[];
  logs: ForwardLog[];
  includeSenderPrefix: boolean;
  forwardDelayMs: number;
  cloudPersistenceEnabled: boolean;
}
