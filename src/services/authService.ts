import { UserProfile, UserSavedStrategy } from '../types/auth';

const TOKEN_KEY = 'ratio_spread_auth_token';
const USER_KEY = 'ratio_spread_user_profile';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setSession(token: string, user: UserProfile): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async me(): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          return data.user;
        }
      }
      this.clearSession();
      return null;
    } catch {
      return this.getUser();
    }
  },

  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Login failed. Invalid credentials.');
    }

    this.setSession(data.token, data.user);
    return { user: data.user, token: data.token };
  },

  async signup(email: string, password: string, displayName: string): Promise<{ message: string; requiresVerification: boolean }> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Signup failed.');
    }

    return {
      message: data.message || 'Account created successfully.',
      requiresVerification: Boolean(data.requiresVerification)
    };
  },

  async verifyEmail(email: string): Promise<boolean> {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    return Boolean(data.success);
  },

  async forgotPassword(email: string): Promise<string> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Password reset request failed.');
    }
    return data.message || 'Password reset instructions sent to email.';
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Change password failed.');
    }
    return true;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
    } catch {
      // ignore
    } finally {
      this.clearSession();
    }
  },

  // Saved Strategies User-Isolated API
  async getSavedStrategies(): Promise<UserSavedStrategy[]> {
    const res = await fetch('/api/user/saved-strategies', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.strategies || [];
  },

  async saveStrategy(strategy: Omit<UserSavedStrategy, 'id' | 'userId' | 'createdAt'>): Promise<UserSavedStrategy> {
    const res = await fetch('/api/user/saved-strategies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(strategy)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to save strategy.');
    }
    return data.strategy;
  },

  async deleteSavedStrategy(id: string): Promise<boolean> {
    const res = await fetch(`/api/user/saved-strategies/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return res.ok;
  },

  // Admin Management API
  async adminGetUsers(): Promise<UserProfile[]> {
    const res = await fetch('/api/admin/users', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin users list.');
    const data = await res.json();
    return data.users || [];
  },

  async adminUpdateUserStatus(userId: string, isActive: boolean): Promise<boolean> {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ isActive })
    });
    return res.ok;
  },

  async adminUpdateUserRole(userId: string, role: 'ADMIN' | 'USER'): Promise<boolean> {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ role })
    });
    return res.ok;
  },

  async adminUpdateUserPlan(userId: string, plan: 'FREE' | 'PRO'): Promise<boolean> {
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ plan })
    });
    return res.ok;
  }
};
