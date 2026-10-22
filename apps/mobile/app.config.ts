import type { ExpoConfig } from 'expo/config';

/** Configuração do app. Valores sensíveis/variáveis vêm de EXPO_PUBLIC_* (ver .env.example). */
const config: ExpoConfig = {
  name: 'Quero Assistir',
  slug: 'quero-assistir',
  scheme: 'queroassistir',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  ios: { bundleIdentifier: 'app.queroassistir.mobile', supportsTablet: false },
  android: { package: 'app.queroassistir.mobile' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-image',
    [
      '@react-native-google-signin/google-signin',
      // Formato: com.googleusercontent.apps.<ID_DO_CLIENT_IOS>
      { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.placeholder' },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
