import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import Binance from 'binance-api-node';
import { RSI, EMA, SMA, ATR } from 'technicalindicators';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import AdmZip from 'adm-zip';

dotenv.config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);

let binanceClient: any = null;
function getBinance() {
  if (!binanceClient) {
    try {
      const binanceConfig: any = {};
      if (process.env.BINANCE_API_KEY && !process.env.BINANCE_API_KEY.includes('YOUR_')) {
        binanceConfig.apiKey = process.env.BINANCE_API_KEY;
      }
      if (process.env.BINANCE_API_SECRET && !process.env.BINANCE_API_SECRET.includes('YOUR_')) {
        binanceConfig.apiSecret = process.env.BINANCE_API_SECRET;
      }
      binanceClient = ((Binance as any).default || Binance)(binanceConfig);
    } catch (err) {
      console.log('[Binance] Initialization attempt:', err);
      throw new Error('Binance initialization failed');
    }
  }
  return binanceClient;
}

function getMockCandles(interval: string, limit: number) {
  const candles: any[] = [];
  let basePrice = 64500;
  let timeStep = 3600000;
  if (interval === '15m') timeStep = 900000;
  if (interval === '4h') timeStep = 14400000;

  const now = Date.now();
  let currentTime = now - (limit * timeStep);

  for (let i = 0; i < limit; i++) {
    const wave = Math.sin(i / 15) * 1200 + Math.cos(i / 5) * 400 + Math.sin(i / 60) * 3500;
    const noise = (Math.random() - 0.49) * 300;
    const close = basePrice + wave + noise;
    const open = i === 0 ? basePrice : parseFloat(candles[i - 1].close);
    const high = Math.max(open, close) + Math.random() * 150;
    const low = Math.min(open, close) - Math.random() * 150;
    const volume = 150 + Math.random() * 600;

    candles.push({
      openTime: currentTime,
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume: volume.toFixed(2),
      closeTime: currentTime + timeStep - 1,
      trades: Math.floor(1200 + Math.random() * 4000),
      quoteAssetVolume: (volume * close).toFixed(2),
      buyActiveBaseAssetVolume: (volume * 0.52).toFixed(2),
      buyActiveQuoteAssetVolume: (volume * 0.52 * close).toFixed(2)
    });

    currentTime += timeStep;
  }
  return candles;
}

async function fetchCandlesSafely(symbol: string, interval: string, limit: number) {
  try {
    const binance = getBinance();
    const candles = await binance.candles({ symbol, interval, limit });
    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      throw new Error('Empty candles response');
    }
    return candles;
  } catch (err: any) {
    console.log(`[Candles] Using mock data for ${symbol}`);
    return getMockCandles(interval, limit);
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

interface Trade {
  id: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  amount: number;
  timestamp: number;
  status: 'OPEN' | 'CLOSED';
  exitPrice?: number;
  pnl?: number;
  stopLoss: number;
  takeProfit: number;
}

let balance = 10000;
let trades: any[] = [];
let currentPosition: any | null = null;

let telegramHandshakeStatus = 'WAITING';
let telegramHandshakeError = '';
let debugLogs: any[] = [];
let lastTelegramStatusUpdateTime = 0;

const TRADE_HISTORY_FILE = path.join(process.cwd(), 'trade_history.json');

function loadLedger() {
  try {
    if (fs.existsSync(TRADE_HISTORY_FILE)) {
      const fileData = fs.readFileSync(TRADE_HISTORY_FILE, 'utf8');
      const data = JSON.parse(fileData);
      if (data) {
        if (data.balance !== undefined) {
          balance = parseFloat(data.balance);
        }
        if (Array.isArray(data.trades)) {
          trades = data.trades;
        }
        console.log(`[Ledger] Loaded state. Balance: $${balance.toFixed(2)}, Trades: ${trades.length}`);
      }
    } else {
      saveLedger();
    }
  } catch (err) {
    console.log('[Ledger] Starting fresh');
  }
}

function saveLedger() {
  try {
    const data = {
      balance,
      trades
    };
    fs.writeFileSync(TRADE_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('[Ledger] Saved successfully');
  } catch (err) {
    console.log('[Ledger] Save error');
  }
}

async function sendTelegram(message: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log('[Telegram] Mocked (no credentials)');
      return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    console.log('[Telegram] Message sent');
  } catch (err: any) {
    console.log('[Telegram] Send error:', err.message);
  }
}

async function testTelegramConnection() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      telegramHandshakeStatus = 'FAILED';
      telegramHandshakeError = 'Missing credentials';
      return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: '✅ AlphaTrade Bot is Online!',
      parse_mode: 'Markdown'
    });

    telegramHandshakeStatus = 'CONNECTED';
    console.log('[Telegram] Connection successful!');
  } catch (err: any) {
    telegramHandshakeStatus = 'FAILED';
    telegramHandshakeError = err.message;
    console.log('[Telegram] Connection failed');
  }
}

async function closePosition(exitPrice: number, reason: string) {
  if (!currentPosition) return;

  const pnl = currentPosition.type === 'LONG'
    ? (exitPrice - currentPosition.entryPrice) * currentPosition.amount
    : (currentPosition.entryPrice - exitPrice) * currentPosition.amount;

  const pnlAfterFees = pnl * 0.998;
  balance += pnlAfterFees;

  const trade = {
    id: currentPosition.id,
    type: currentPosition.type,
    entryPrice: currentPosition.entryPrice,
    exitPrice: exitPrice,
    amount: currentPosition.amount,
    pnl: pnlAfterFees,
    timestamp: Date.now(),
    reason: reason
  };

  trades.push(trade);
  saveLedger();

  const signEmoji = pnlAfterFees >= 0 ? '✅' : '❌';
  await sendTelegram(`${signEmoji} *${currentPosition.type} Closed (${reason})*\nEntry: $${currentPosition.entryPrice.toLocaleString()}\nExit: $${exitPrice.toLocaleString()}\nNet PnL: $${pnlAfterFees.toFixed(2)}\nRunning Balance: $${balance.toFixed(2)}`);

  currentPosition = null;
}

function parseEnvThreshold(envVar: string | undefined, defaultValue: number): number {
  if (envVar && !isNaN(Number(envVar))) {
    return Number(envVar);
  }
  return defaultValue;
}

interface Config {
  stopLossPct: number;
  takeProfitPct: number;
  tradeSizePct: number;
  isAutoTradingEnabled: boolean;
  enableShorts: boolean;
  buyThreshold: number;
  sellThreshold: number;
  shortEntryThreshold: number;
  shortExitThreshold: number;
  cooldownMinutes: number;
  trailingStopPct: number;
  rrRatio: number;
  sizingMode: string;
  baseBalance: number;
  volatilityRefPct: number;
  sizingMinPct: number;
  sizingMaxPct: number;
  leverage: number;
  feePct: number;
}

const config: Config = {
  stopLossPct: parseFloat(process.env.STOP_LOSS_PCT || '2.0'),
  takeProfitPct: parseFloat(process.env.TAKE_PROFIT_PCT || '4.0'),
  tradeSizePct: parseFloat(process.env.TRADE_SIZE_PCT || '9.0'),
  isAutoTradingEnabled: true,
  enableShorts: true,
  buyThreshold: parseEnvThreshold(process.env.BUY_THRESHOLD, 65),
  sellThreshold: 25,
  shortEntryThreshold: parseEnvThreshold(process.env.SHORT_ENTRY_THRESHOLD, -65),
  shortExitThreshold: 75,
  cooldownMinutes: 15,
  trailingStopPct: 1.0,
  rrRatio: 2.0,
  sizingMode: 'fixed',
  baseBalance: 10000.0,
  volatilityRefPct: 1.5,
  sizingMinPct: 0.5,
  sizingMaxPct: 10.0,
  leverage: 1,
  feePct: 0.05,
};

const tradingConfig = config;

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period) return 50;
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  const rs = avgGain / (avgLoss || 1);
  return 100 - (100 / (1 + rs));
}

function calculateEMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1];
  const multiplier = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * multiplier + ema * (1 - multiplier);
  }
  return ema;
}

function calculateSupertrend(highs: number[], lows: number[], closes: number[], period: number = 10, multiplier: number = 3): number {
  if (highs.length < period) return closes[closes.length - 1] > closes[0] ? 1 : -1;
  
  const hl2s = highs.map((h, i) => (h + lows[i]) / 2);
  const atr = calculateATR(highs, lows, closes, period);
  const emaHl2 = calculateEMA(hl2s, period);
  const basicUpperBand = emaHl2 + multiplier * atr;
  const basicLowerBand = emaHl2 - multiplier * atr;
  
  const currentPrice = closes[closes.length - 1];
  return currentPrice > basicUpperBand ? 1 : (currentPrice < basicLowerBand ? -1 : 1);
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period) return 0;
  const trs = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

async function calculateSignals(symbol: string = 'BTCUSDT'): Promise<any> {
  const candles1h = await fetchCandlesSafely(symbol, '1h', 100);
  const candles4h = await fetchCandlesSafely(symbol, '4h', 50);

  const closes1h = candles1h.map((c: any) => parseFloat(c.close));
  const highs1h = candles1h.map((c: any) => parseFloat(c.high));
  const lows1h = candles1h.map((c: any) => parseFloat(c.low));

  const closes4h = candles4h.map((c: any) => parseFloat(c.close));
  const highs4h = candles4h.map((c: any) => parseFloat(c.high));
  const lows4h = candles4h.map((c: any) => parseFloat(c.low));

  const price = closes1h[closes1h.length - 1];
  const rsi = calculateRSI(closes1h, 14);
  const ema200 = calculateEMA(closes1h, 200);
  const trend = calculateSupertrend(highs1h, lows1h, closes1h, 10, 3);
  const h4Trend = calculateSupertrend(highs4h, lows4h, closes4h, 10, 3);

  let score = 0;
  const emaBullish = price > ema200 ? 1 : -1;
  const rsiSignal = rsi < 30 ? 20 : (rsi > 70 ? -20 : (rsi < 50 ? 10 : -10));

  score += trend * 30;
  score += emaBullish * 15;
  score += rsiSignal;
  score += h4Trend * 10;

  const localHigh = Math.max(...closes1h.slice(-20));
  const localLow = Math.min(...closes1h.slice(-20));

  return {
    price,
    rsi,
    ema200,
    trend,
    h4Trend,
    score,
    recentCandles: closes1h.slice(-20),
    localHigh,
    localLow
  };
}

function registerRoutes(app: express.Application) {
  app.get('/api/trading/config', (req, res) => {
    res.json({ config });
  });

  app.get('/api/trading/status', (req, res) => {
    res.json({
      balance,
      trades: trades.length,
      currentPosition,
      telegramStatus: telegramHandshakeStatus,
      telegramError: telegramHandshakeError
    });
  });

  app.get('/api/trading/logs', (req, res) => {
    res.json(debugLogs);
  });

  app.get('/api/trading/history', (req, res) => {
    res.json(trades);
  });

  app.post('/api/trading/ledger/reset', (req, res) => {
    const password = req.body.password;
    if (password !== process.env.ADMIN_PASSWORD) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }
    balance = 10000;
    trades = [];
    saveLedger();
    res.json({ message: 'Ledger reset', balance, trades });
  });

  app.post('/api/trading/config', (req, res) => {
    const password = req.body.password;
    if (password !== process.env.ADMIN_PASSWORD) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }
    Object.assign(config, req.body.config);
    res.json({ message: 'Config updated', config });
  });

  app.get('/api/export-zip', (req, res) => {
    const zip = new AdmZip();
    zip.addFile('trade_history.json', Buffer.from(JSON.stringify({ balance, trades }, null, 2)));
    zip.addFile('config.json', Buffer.from(JSON.stringify(config, null, 2)));
    zip.addFile('logs.json', Buffer.from(JSON.stringify(debugLogs, null, 2)));
    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="alphatrade_export.zip"');
    res.send(zipBuffer);
  });
}

async function startServer() {
  setInterval(async () => {
    try {
      const signals = await calculateSignals('BTCUSDT');
      const now = Date.now();

      const msSinceLastTrade = trades.length > 0 
        ? now - (trades[trades.length - 1].timestamp || 0)
        : Infinity;
      const cooldownMs = config.cooldownMinutes * 60 * 1000;

      const isLongTriggered = !currentPosition && signals.score >= config.buyThreshold && msSinceLastTrade >= cooldownMs && (signals as any).h4Trend === 1;
      const isShortTriggered = !currentPosition && config.enableShorts && signals.score <= config.shortEntryThreshold && msSinceLastTrade >= cooldownMs && (signals as any).h4Trend === -1;
      const isTriggered = isLongTriggered || isShortTriggered;

      const newLogRecord = {
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        score: signals.score,
        rsi: signals.rsi,
        ema200: signals.ema200,
        price: signals.price,
        trend: signals.trend,
        h4Trend: (signals as any).h4Trend,
        triggered: isTriggered
      };

      debugLogs.unshift(newLogRecord);
      if (debugLogs.length > 100) {
        debugLogs.pop();
      }

      console.log(`[AutoEngine] Score: ${newLogRecord.score} | Triggered: ${newLogRecord.triggered}`);

      if (now - lastTelegramStatusUpdateTime >= 30 * 60 * 1000) {
        lastTelegramStatusUpdateTime = now;
        const statusMessage = `📊 *AlphaTrade Bot Status*
        
• *Current Price:* $${signals.price.toLocaleString()}
• *Signal Score:* ${signals.score}
• *Score Needed:* LONG >= ${config.buyThreshold}, SHORT <= ${config.shortEntryThreshold}
• *RSI (14):* ${signals.rsi?.toFixed(1)}
• *EMA200:* $${signals.ema200?.toFixed(1)} (Price is ${signals.price >= signals.ema200 ? 'ABOVE' : 'BELOW'} EMA200)
• *Supertrend Type (1H):* ${signals.trend === 1 ? 'Bullish 🟢' : 'Bearish 🔴'}
• *H4 HTF Trend:* ${(signals as any).h4Trend === 1 ? 'Bullish 🟢' : 'Bearish 🔴'}
• *Balance:* $${balance.toFixed(2)}`;

        await sendTelegram(statusMessage);
      }

      if (tradingConfig.isAutoTradingEnabled) {
        if (isLongTriggered) {
          const price = signals.price;
          const tradeAmount = balance * 0.02;
          const qty = tradeAmount / price;
          const slPrice = price * (1 - config.stopLossPct / 100);
          const tpPrice = price * (1 + config.takeProfitPct / 100);

          currentPosition = {
            id: Math.random().toString(36).substring(7),
            type: 'LONG',
            entryPrice: price,
            amount: qty,
            timestamp: now,
            leverageUsed: 1,
            status: 'OPEN',
            stopLoss: slPrice,
            takeProfit: tpPrice
          };
          await sendTelegram(`🤖 *Auto-Trade LONG*\nPrice: $${price.toLocaleString()}\nSL: $${slPrice.toFixed(2)}\nTP: $${tpPrice.toFixed(2)}`);
        }
        else if (isShortTriggered) {
          const price = signals.price;
          const tradeAmount = balance * 0.02;
          const qty = tradeAmount / price;
          const slPrice = price * (1 + config.stopLossPct / 100);
          const tpPrice = price * (1 - config.takeProfitPct / 100);

          currentPosition = {
            id: Math.random().toString(36).substring(7),
            type: 'SHORT',
            entryPrice: price,
            amount: qty,
            timestamp: now,
            leverageUsed: 1,
            status: 'OPEN',
            stopLoss: slPrice,
            takeProfit: tpPrice
          };
          await sendTelegram(`🤖 *Auto-Trade SHORT*\nPrice: $${price.toLocaleString()}\nSL: $${slPrice.toFixed(2)}\nTP: $${tpPrice.toFixed(2)}`);
        }

        if (currentPosition) {
          if (currentPosition.type === 'LONG' && signals.score <= config.sellThreshold) {
            await closePosition(signals.price, 'AUTO_DOWNTREND');
          } else if (currentPosition.type === 'SHORT' && signals.score >= config.shortExitThreshold) {
            await closePosition(signals.price, 'AUTO_UPTREND');
          }
        }
      }
    } catch (err) {
      console.error('[AutoEngine] Error:', err);
    }
  }, 60000);

  loadLedger();
  testTelegramConnection();
  registerRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(process.cwd(), 'dist/index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
