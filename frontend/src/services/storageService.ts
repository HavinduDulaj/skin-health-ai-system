import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppSettings, ScanResult, SkinProfile, UserAccount } from '../types';

const STORAGE_KEYS = {
  account: 'dermasafe-account',
  accounts: 'dermasafe-accounts',
  profile: 'dermasafe-profile',
  profiles: 'dermasafe-profiles',
  history: 'dermasafe-history',
  historyByEmail: 'dermasafe-history-by-email',
  settings: 'dermasafe-settings',
  session: 'dermasafe-session',
};

const defaultSettings: AppSettings = {
  themeMode: 'light',
  notificationsEnabled: true,
};

async function setItem<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getItem<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : null;
}

export const storageService = {
  async saveAccount(account: UserAccount) {
    const accounts = await this.getAccounts();
    const normalizedEmail = account.email.trim().toLowerCase();
    const withoutExisting = accounts.filter((item) => item.email.trim().toLowerCase() !== normalizedEmail);
    const nextAccounts = [...withoutExisting, account];
    await setItem(STORAGE_KEYS.accounts, nextAccounts);
    await setItem(STORAGE_KEYS.account, account);
  },
  async getAccount() {
    const activeEmail = await this.getSessionEmail();
    if (activeEmail) {
      return this.getAccountByEmail(activeEmail);
    }
    return getItem<UserAccount>(STORAGE_KEYS.account);
  },
  async getAccounts() {
    const accounts = (await getItem<UserAccount[]>(STORAGE_KEYS.accounts)) ?? [];
    const legacyAccount = await getItem<UserAccount>(STORAGE_KEYS.account);
    if (!legacyAccount) {
      return accounts;
    }

    const hasLegacy = accounts.some(
      (item) => item.email.trim().toLowerCase() === legacyAccount.email.trim().toLowerCase()
    );
    if (hasLegacy) {
      return accounts;
    }

    const migrated = [...accounts, legacyAccount];
    await setItem(STORAGE_KEYS.accounts, migrated);
    return migrated;
  },
  async getAccountByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const accounts = await this.getAccounts();
    return accounts.find((account) => account.email.trim().toLowerCase() === normalizedEmail) ?? null;
  },
  async saveProfile(profile: SkinProfile) {
    const activeEmail = await this.getSessionEmail();
    if (activeEmail) {
      const profiles = (await getItem<Record<string, SkinProfile>>(STORAGE_KEYS.profiles)) ?? {};
      await setItem(STORAGE_KEYS.profiles, {
        ...profiles,
        [activeEmail]: profile,
      });
    }
    await setItem(STORAGE_KEYS.profile, profile);
  },
  async getProfile() {
    const activeEmail = await this.getSessionEmail();
    if (activeEmail) {
      const profiles = (await getItem<Record<string, SkinProfile>>(STORAGE_KEYS.profiles)) ?? {};
      return profiles[activeEmail] ?? null;
    }
    return getItem<SkinProfile>(STORAGE_KEYS.profile);
  },
  async saveSettings(settings: AppSettings) {
    await setItem(STORAGE_KEYS.settings, settings);
  },
  async getSettings() {
    return (await getItem<AppSettings>(STORAGE_KEYS.settings)) ?? defaultSettings;
  },
  async getHistory() {
    const activeEmail = await this.getSessionEmail();
    if (activeEmail) {
      const historyByEmail = (await getItem<Record<string, ScanResult[]>>(STORAGE_KEYS.historyByEmail)) ?? {};
      return historyByEmail[activeEmail] ?? [];
    }
    return (await getItem<ScanResult[]>(STORAGE_KEYS.history)) ?? [];
  },
  async addHistoryItem(item: ScanResult) {
    const history = await this.getHistory();
    const nextHistory = [item, ...history];
    const activeEmail = await this.getSessionEmail();
    if (activeEmail) {
      const historyByEmail = (await getItem<Record<string, ScanResult[]>>(STORAGE_KEYS.historyByEmail)) ?? {};
      await setItem(STORAGE_KEYS.historyByEmail, {
        ...historyByEmail,
        [activeEmail]: nextHistory,
      });
      return;
    }
    await setItem(STORAGE_KEYS.history, nextHistory);
  },
  async saveSession(active: boolean) {
    await setItem(STORAGE_KEYS.session, active);
  },
  async saveSessionEmail(email: string) {
    await setItem(STORAGE_KEYS.session, email.trim().toLowerCase());
  },
  async getSession() {
    const session = await getItem<boolean | string>(STORAGE_KEYS.session);
    return Boolean(session);
  },
  async getSessionEmail() {
    const session = await getItem<boolean | string>(STORAGE_KEYS.session);
    return typeof session === 'string' ? session : null;
  },
  async clearSession() {
    await AsyncStorage.removeItem(STORAGE_KEYS.session);
  },
  async clearAuthData() {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.account),
      AsyncStorage.removeItem(STORAGE_KEYS.accounts),
      AsyncStorage.removeItem(STORAGE_KEYS.profile),
      AsyncStorage.removeItem(STORAGE_KEYS.profiles),
      AsyncStorage.removeItem(STORAGE_KEYS.history),
      AsyncStorage.removeItem(STORAGE_KEYS.historyByEmail),
      AsyncStorage.removeItem(STORAGE_KEYS.session),
    ]);
  },
};
