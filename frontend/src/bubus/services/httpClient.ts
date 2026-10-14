import Constants from 'expo-constants';
import { Platform } from 'react-native';

const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
const host = Platform.OS === 'web' ? globalThis.location?.hostname || 'localhost' : hostUri?.split(':')[0] || '10.0.2.2';
export const INGREDIENT_API_URL = `http://${host}:8001`;

export async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${INGREDIENT_API_URL}${path}`, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail;
      const message = typeof detail === 'string' ? detail : Array.isArray(detail)
        ? detail.map((item: { msg: string }) => item.msg).join('; ') : 'The request could not be completed. Please try again.';
      throw new Error(message);
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('This request took too long. Please try again.');
    if (error instanceof TypeError) throw new Error('Unable to connect. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
