import { API_BASE_URL } from './analysisService';
import type { AuthUser, UserAccount } from '../types';

type AuthResponse = {
  message?: string;
  user?: AuthUser;
};

async function requestAuth(path: string, payload: Record<string, string>): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as AuthResponse;

  if (!response.ok || !data.user) {
    throw new Error(data.message || 'Authentication request failed.');
  }

  return data.user;
}

export const authService = {
  register(account: UserAccount) {
    return requestAuth('/auth/register', {
      fullName: account.fullName,
      email: account.email,
      password: account.password,
    });
  },
  login(email: string, password: string) {
    return requestAuth('/auth/login', {
      email,
      password,
    });
  },
};
