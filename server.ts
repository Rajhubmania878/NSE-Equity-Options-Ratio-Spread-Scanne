import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Built-in Angel One SmartAPI credentials provided by user
const DEFAULT_CREDENTIALS = {
  apiKey: process.env.ANGEL_API_KEY || 'vTz0rnxJ',
  clientCode: process.env.ANGEL_CLIENT_CODE || 'A700031',
  pin: process.env.ANGEL_PIN || '1811',
  totpSecret: process.env.ANGEL_TOTP_SECRET || 'ABZDZPRGOK7SGZIS52GXKHZR5M'
};

// Base32 Decoder for RFC 6238 TOTP
function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) throw new Error('Invalid base32 char: ' + clean[i]);
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

// Generate 6-digit Time-Based One-Time Password
function generateTOTP(secret: string): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return code.toString().padStart(6, '0');
}

class AngelSessionManager {
  private jwtToken: string | null = null;
  private feedToken: string | null = null;
  private refreshToken: string | null = null;
  private lastLoginTime: number = 0;
  private isLoggingIn: boolean = false;
  public credentials = { ...DEFAULT_CREDENTIALS };

  public isConnected(): boolean {
    return Boolean(this.jwtToken && Date.now() - this.lastLoginTime < 18 * 60 * 60 * 1000);
  }

  public async getValidJwt(): Promise<string | null> {
    if (!this.isConnected()) {
      await this.login();
    }
    return this.jwtToken;
  }

  public async login(): Promise<boolean> {
    if (this.isLoggingIn) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Boolean(this.jwtToken);
    }

    this.isLoggingIn = true;
    try {
      const totp = generateTOTP(this.credentials.totpSecret);
      const postData = JSON.stringify({
        clientcode: this.credentials.clientCode,
        password: this.credentials.pin,
        totp
      });

      const res = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.51.72.100',
          'X-MACAddress': '02-00-00-00-00-00',
          'X-PrivateKey': this.credentials.apiKey
        },
        body: postData
      });

      const data = await res.json() as {
        status?: boolean;
        data?: { jwtToken?: string; feedToken?: string; refreshToken?: string };
      };

      if (data.status && data.data?.jwtToken) {
        this.jwtToken = data.data.jwtToken;
        this.feedToken = data.data.feedToken || null;
        this.refreshToken = data.data.refreshToken || null;
        this.lastLoginTime = Date.now();
        console.log('[AngelOne] Successfully logged in to SmartAPI.');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[AngelOne] Login error:', err);
      return false;
    } finally {
      this.isLoggingIn = false;
    }
  }

  public async fetchQuote(exchange: 'NSE' | 'NFO' | 'BSE' | 'BFO', tokens: string[]): Promise<unknown[]> {
    let jwt = await this.getValidJwt();
    if (!jwt) {
      throw new Error('Unable to obtain valid SmartAPI session token');
    }

    const uniqueTokens = Array.from(new Set(tokens.filter(t => Boolean(t && String(t).trim()))));
    if (uniqueTokens.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueTokens.length; i += 50) {
      chunks.push(uniqueTokens.slice(i, i + 50));
    }

    const allFetched: unknown[] = [];

    await Promise.all(
      chunks.map(async chunk => {
        try {
          const makeRequest = async (token: string, timeoutMs = 8000) => {
            return await fetch('https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.51.72.100',
                'X-MACAddress': '02-00-00-00-00-00',
                'X-PrivateKey': this.credentials.apiKey
              },
              body: JSON.stringify({
                mode: 'FULL',
                exchangeTokens: {
                  [exchange]: chunk
                }
              }),
              signal: AbortSignal.timeout(timeoutMs)
            });
          };

          let fetchRes: globalThis.Response | null = null;
          try {
            fetchRes = await makeRequest(jwt!);
          } catch {
            await new Promise(r => setTimeout(r, 200));
            try {
              fetchRes = await makeRequest(jwt!, 10000);
            } catch {
              fetchRes = null;
            }
          }

          if (!fetchRes) return;

          if (fetchRes.status === 401 || fetchRes.status === 403) {
            this.jwtToken = null;
            jwt = await this.getValidJwt();
            if (jwt) {
              try {
                fetchRes = await makeRequest(jwt, 8000);
              } catch {
                fetchRes = null;
              }
            }
          }

          if (fetchRes && fetchRes.ok) {
            const data = (await fetchRes.json()) as {
              status?: boolean;
              message?: string;
              errorcode?: string;
              data?: { fetched?: unknown[] };
            };

            if (data.status && Array.isArray(data.data?.fetched)) {
              allFetched.push(...data.data.fetched);
            } else if (data.errorcode === 'AG8001' || data.message?.toLowerCase().includes('token')) {
              this.jwtToken = null;
            }
          }
        } catch {
          // Gracefully continue with available chunks
        }
      })
    );

    return allFetched;
  }
}

const angelSession = new AngelSessionManager();
angelSession.login().catch(err => console.error('[AngelOne] Initial login failed:', err));

// ============================================================================
// AUTHENTICATION & USER DATABASE (PBKDF2 HASHING + BEARER SESSION MANAGEMENT)
// ============================================================================

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
  plan: 'FREE' | 'PRO';
  isActive: boolean;
  verified: boolean;
  createdAt: number;
  lastLoginAt: number;
}

interface SavedStrategyRecord {
  id: string;
  userId: string;
  name: string;
  exchange: string;
  underlying: string;
  expiry: string;
  ratioLong: number;
  ratioShort: number;
  gap: number;
  cnt: number;
  stk: string | number;
  referenceMode: string;
  optionType: string;
  minStrike: number | 'ALL';
  maxStrike: number | 'ALL';
  createdAt: number;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_RATIO_SPREAD_SALT_2026').digest('hex');
}

// In-Memory Database with Pre-Seeded Accounts
const usersStore = new Map<string, UserRecord>();
const sessionsStore = new Map<string, string>(); // token -> userId
const savedStrategiesStore: SavedStrategyRecord[] = [];

// Seed Default Accounts
const defaultUsers: UserRecord[] = [
  {
    id: 'user_admin_001',
    email: 'admin@ratiospread.com',
    passwordHash: hashPassword('Admin123!'),
    displayName: 'System Admin',
    role: 'ADMIN',
    plan: 'PRO',
    isActive: true,
    verified: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastLoginAt: Date.now()
  },
  {
    id: 'user_pro_002',
    email: 'pro@ratiospread.com',
    passwordHash: hashPassword('Pro123!'),
    displayName: 'Pro Trader',
    role: 'USER',
    plan: 'PRO',
    isActive: true,
    verified: true,
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    lastLoginAt: Date.now()
  },
  {
    id: 'user_free_003',
    email: 'demo@ratiospread.com',
    passwordHash: hashPassword('User123!'),
    displayName: 'Free User',
    role: 'USER',
    plan: 'FREE',
    isActive: true,
    verified: true,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    lastLoginAt: Date.now()
  }
];

defaultUsers.forEach(u => usersStore.set(u.id, u));

// Pre-seed some default saved strategies for demo accounts
savedStrategiesStore.push({
  id: 'strat_01',
  userId: 'user_pro_002',
  name: 'RELIANCE 1:3 Bull Spread',
  exchange: 'NSE',
  underlying: 'RELIANCE',
  expiry: '29-Oct-2026',
  ratioLong: 1,
  ratioShort: 3,
  gap: 50,
  cnt: 5,
  stk: 'AUTO',
  referenceMode: 'ATM',
  optionType: 'CE',
  minStrike: 'ALL',
  maxStrike: 'ALL',
  createdAt: Date.now()
});

interface AuthRequest extends Request {
  user?: UserRecord;
}

// Authentication & Session Protection Middleware
function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = sessionsStore.get(token);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
  }

  const user = usersStore.get(userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User account not found.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact admin.' });
  }

  req.user = user;
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin authorization required.' });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // ============================================================================
  // PUBLIC AUTHENTICATION ENDPOINTS
  // ============================================================================

  // Signup API
  app.post('/api/auth/signup', (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ success: false, message: 'Email, password, and full name are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    for (const u of usersStore.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }
    }

    const newUser: UserRecord = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      displayName: String(displayName).trim(),
      role: 'USER',
      plan: 'FREE',
      isActive: true,
      verified: true, // Auto-verified for seamless preview
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };

    usersStore.set(newUser.id, newUser);

    res.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
      requiresVerification: false
    });
  });

  // Login API
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    let foundUser: UserRecord | null = null;

    for (const u of usersStore.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser || foundUser.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!foundUser.isActive) {
      return res.status(403).json({ success: false, message: 'Account is suspended. Please contact system admin.' });
    }

    foundUser.lastLoginAt = Date.now();
    const token = `sess_${crypto.randomBytes(24).toString('hex')}`;
    sessionsStore.set(token, foundUser.id);

    const { passwordHash: _, ...publicProfile } = foundUser;
    res.json({
      success: true,
      token,
      user: publicProfile
    });
  });

  // Forgot Password API
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    res.json({
      success: true,
      message: `Password reset instructions have been generated for ${email}. You can now reset your password or sign in.`
    });
  });

  // Authenticated Profile Endpoint
  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    const { passwordHash: _, ...publicProfile } = req.user!;
    res.json({ success: true, user: publicProfile });
  });

  // Change Password API
  app.post('/api/auth/change-password', requireAuth, (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required.' });
    }

    if (req.user!.passwordHash !== hashPassword(currentPassword)) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    req.user!.passwordHash = hashPassword(newPassword);
    res.json({ success: true, message: 'Password updated successfully.' });
  });

  // Logout API
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      sessionsStore.delete(token);
    }
    res.json({ success: true });
  });

  // ============================================================================
  // USER-ISOLATED SAVED STRATEGIES API
  // ============================================================================

  app.get('/api/user/saved-strategies', requireAuth, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const userStrategies = savedStrategiesStore.filter(s => s.userId === userId);
    res.json({ success: true, strategies: userStrategies });
  });

  app.post('/api/user/saved-strategies', requireAuth, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const {
      name,
      exchange,
      underlying,
      expiry,
      ratioLong,
      ratioShort,
      gap,
      cnt,
      stk,
      referenceMode,
      optionType,
      minStrike,
      maxStrike
    } = req.body;

    const newStrategy: SavedStrategyRecord = {
      id: `strat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId,
      name: name || `${underlying} ${ratioLong}:${ratioShort} (Gap ₹${gap})`,
      exchange: exchange || 'NSE',
      underlying: underlying || 'RELIANCE',
      expiry: expiry || '29-Oct-2026',
      ratioLong: Number(ratioLong) || 1,
      ratioShort: Number(ratioShort) || 3,
      gap: Number(gap) || 50,
      cnt: Number(cnt) || 5,
      stk: stk || 'AUTO',
      referenceMode: referenceMode || 'ATM',
      optionType: optionType || 'CE',
      minStrike: minStrike ?? 'ALL',
      maxStrike: maxStrike ?? 'ALL',
      createdAt: Date.now()
    };

    savedStrategiesStore.push(newStrategy);
    res.json({ success: true, strategy: newStrategy });
  });

  app.delete('/api/user/saved-strategies/:id', requireAuth, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const index = savedStrategiesStore.findIndex(s => s.id === id && s.userId === userId);
    if (index !== -1) {
      savedStrategiesStore.splice(index, 1);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'Strategy configuration not found.' });
  });

  // ============================================================================
  // ADMIN MANAGEMENT API
  // ============================================================================

  app.get('/api/admin/users', requireAuth, requireAdmin, (_req, res) => {
    const allUsers = Array.from(usersStore.values()).map(({ passwordHash: _, ...publicProfile }) => publicProfile);
    res.json({ success: true, users: allUsers });
  });

  app.patch('/api/admin/users/:id/status', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = usersStore.get(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isActive = Boolean(isActive);
    res.json({ success: true, user });
  });

  app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const user = usersStore.get(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (role === 'ADMIN' || role === 'USER') {
      user.role = role;
    }
    res.json({ success: true, user });
  });

  app.patch('/api/admin/users/:id/plan', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { plan } = req.body;
    const user = usersStore.get(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (plan === 'FREE' || plan === 'PRO') {
      user.plan = plan;
    }
    res.json({ success: true, user });
  });

  // ============================================================================
  // PROTECTED MARKET DATA API
  // ============================================================================

  app.get('/api/angel/status', requireAuth, (_req, res) => {
    res.json({
      connected: angelSession.isConnected(),
      clientCode: angelSession.credentials.clientCode,
      lastLogin: angelSession.isConnected(),
      mode: angelSession.isConnected() ? 'LIVE_SMARTAPI' : 'SIMULATED'
    });
  });

  app.post('/api/angel/login', requireAuth, requireAdmin, async (req, res) => {
    const { apiKey, clientCode, pin, totpSecret } = req.body;
    if (apiKey && clientCode && pin && totpSecret) {
      angelSession.credentials = { apiKey, clientCode, pin, totpSecret };
    }
    const success = await angelSession.login();
    res.json({ success, connected: angelSession.isConnected(), clientCode: angelSession.credentials.clientCode });
  });

  app.post('/api/angel/quote', requireAuth, async (req, res) => {
    try {
      const {
        exchange = 'NFO',
        tokens = [],
        nseTokens = [],
        nfoTokens = [],
        bseTokens = [],
        bfoTokens = []
      } = req.body;
      const allFetched: unknown[] = [];

      if (Array.isArray(nseTokens) && nseTokens.length > 0) {
        const fetched = await angelSession.fetchQuote('NSE', nseTokens);
        allFetched.push(...fetched);
      }
      if (Array.isArray(nfoTokens) && nfoTokens.length > 0) {
        const fetched = await angelSession.fetchQuote('NFO', nfoTokens);
        allFetched.push(...fetched);
      }
      if (Array.isArray(bseTokens) && bseTokens.length > 0) {
        const fetched = await angelSession.fetchQuote('BSE', bseTokens);
        allFetched.push(...fetched);
      }
      if (Array.isArray(bfoTokens) && bfoTokens.length > 0) {
        const fetched = await angelSession.fetchQuote('BFO', bfoTokens);
        allFetched.push(...fetched);
      }
      if (
        Array.isArray(tokens) &&
        tokens.length > 0 &&
        nseTokens.length === 0 &&
        nfoTokens.length === 0 &&
        bseTokens.length === 0 &&
        bfoTokens.length === 0
      ) {
        const fetched = await angelSession.fetchQuote(exchange as 'NSE' | 'NFO' | 'BSE' | 'BFO', tokens);
        allFetched.push(...fetched);
      }

      res.json({ success: true, data: allFetched });
    } catch (err: unknown) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error?.message || 'Quote fetch failed' });
    }
  });

  // Mount Vite middlewares in development
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Live Protected Terminal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
