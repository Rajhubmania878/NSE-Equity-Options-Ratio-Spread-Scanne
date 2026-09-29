export type UserRole = 'ADMIN' | 'USER';
export type UserPlan = 'FREE' | 'PRO';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  plan: UserPlan;
  isActive: boolean;
  verified: boolean;
  createdAt: number;
  lastLoginAt: number;
  preferences?: {
    defaultExchange?: string;
    defaultRatioLong?: number;
    defaultRatioShort?: number;
    defaultGap?: number;
    defaultCnt?: number;
    defaultStk?: string | number;
  };
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UserSavedStrategy {
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
