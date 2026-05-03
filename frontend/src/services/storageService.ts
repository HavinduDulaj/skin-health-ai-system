import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppSettings, ScanResult, SkinProfile, UserAccount } from '../types';

const STORAGE_KEYS = {
  account: 'dermasafe-account',
  profile: 'dermasafe-profile',
  history: 'dermasafe-history',
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
    await setItem(STORAGE_KEYS.account, account);
  },
  async getAccount() {
    return getItem<UserAccount>(STORAGE_KEYS.account);
  },
  async saveProfile(profile: SkinProfile) {
    await setItem(STORAGE_KEYS.profile, profile);
  },
  async getProfile() {
    return getItem<SkinProfile>(STORAGE_KEYS.profile);
  },
  async saveSettings(settings: AppSettings) {
    await setItem(STORAGE_KEYS.settings, settings);
  },
  async getSettings() {
    return (await getItem<AppSettings>(STORAGE_KEYS.settings)) ?? defaultSettings;
  },
  async getHistory() {
    return (await getItem<ScanResult[]>(STORAGE_KEYS.history)) ?? [];
  },
  async addHistoryItem(item: ScanResult) {
    const history = await this.getHistory();
    history.unshift(item);
    await setItem(STORAGE_KEYS.history, history);
  },
  async saveSession(active: boolean) {
    await setItem(STORAGE_KEYS.session, active);
  },
  async getSession() {
    return (await getItem<boolean>(STORAGE_KEYS.session)) ?? false;
  },
  async clearSession() {
    await AsyncStorage.removeItem(STORAGE_KEYS.session);
  },
};
