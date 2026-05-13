export type BrokerId =
  | 'exness' | 'xm' | 'vantage' | 'winpro' | 'icmarkets'
  | 'pepperstone' | 'fxtm' | 'deriv' | 'fbs' | 'other';

export interface BrokerConfig {
  name: string;
  servers: { mt4: string[]; mt5: string[] };
  platforms: ('mt4' | 'mt5')[];
}

export const BROKERS: Record<BrokerId, BrokerConfig> = {
  exness: {
    name: 'Exness',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['Exness-MT4Real', 'Exness-MT4Real2', 'Exness-MT4Trial'],
      mt5: ['Exness-MT5Real', 'Exness-MT5Real2', 'Exness-MT5Real3', 'Exness-MT5Trial'],
    },
  },
  xm: {
    name: 'XM',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['XMGlobal-MT4', 'XMGlobal-MT4 2'],
      mt5: ['XMGlobal-MT5', 'XMGlobal-MT5 2', 'XMGlobal-MT5 3'],
    },
  },
  vantage: {
    name: 'Vantage',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['VantageInternational-Live-4', 'VantageInternational-Demo-4'],
      mt5: ['VantageInternational-Live', 'VantageInternational-Demo'],
    },
  },
  winpro: {
    name: 'WinPro',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['WinProMarkets-Live', 'WinProMarkets-Demo'],
      mt5: ['WinProMarkets-Live5', 'WinProMarkets-Demo5'],
    },
  },
  icmarkets: {
    name: 'IC Markets',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['ICMarketsSC-Live', 'ICMarketsSC-Live2', 'ICMarketsSC-Demo'],
      mt5: ['ICMarketsSC-Live5', 'ICMarketsSC-Live6', 'ICMarketsSC-Demo'],
    },
  },
  pepperstone: {
    name: 'Pepperstone',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['Pepperstone-Edge-Live', 'Pepperstone-Edge-Demo'],
      mt5: ['Pepperstone-MT5-Live', 'Pepperstone-MT5-Demo'],
    },
  },
  fxtm: {
    name: 'FXTM',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['ForexTime-MT4Live', 'ForexTime-MT4Demo'],
      mt5: ['ForexTime-MT5Live', 'ForexTime-MT5Demo'],
    },
  },
  deriv: {
    name: 'Deriv',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['Deriv-Demo', 'Deriv-Server'],
      mt5: ['Deriv-MT5-Real', 'Deriv-MT5-Demo'],
    },
  },
  fbs: {
    name: 'FBS',
    platforms: ['mt4', 'mt5'],
    servers: {
      mt4: ['FBS-Real', 'FBS-Demo'],
      mt5: ['FBS-MT5-Real', 'FBS-MT5-Demo'],
    },
  },
  other: {
    name: 'Other',
    platforms: ['mt4', 'mt5'],
    servers: { mt4: [], mt5: [] },
  },
};

export const BROKER_IDS = Object.keys(BROKERS) as BrokerId[];
