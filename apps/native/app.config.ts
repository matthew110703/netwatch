import type { ExpoConfig, ConfigContext } from 'expo/config';

export type AppEnv = 'development' | 'staging' | 'production';

function resolveAppEnv(): AppEnv {
  const raw = (process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV || 'development')
    .trim()
    .toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'staging' || raw === 'preview') return 'staging';
  return 'development';
}

function getAppName(env: AppEnv): string {
  if (env === 'production') return 'Netwatch';
  if (env === 'staging') return 'Netwatch (Staging)';
  return 'Netwatch (Dev)';
}

function getBundleIdentifier(env: AppEnv): string {
  if (env === 'production') return 'com.afterlife.netwatch';
  if (env === 'staging') return 'com.afterlife.netwatch.staging';
  return 'com.afterlife.netwatch.dev';
}

function getScheme(env: AppEnv): string {
  if (env === 'production') return 'netwatch';
  if (env === 'staging') return 'netwatch-staging';
  return 'netwatch-dev';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = resolveAppEnv();
  const bundleId = getBundleIdentifier(appEnv);
  const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  const netwatchPort = (process.env.EXPO_PUBLIC_NETWATCH_PORT || '3000').trim();

  return {
    ...config,
    name: getAppName(appEnv),
    slug: 'netwatch-native',
    version: config.version || '1.0.0',
    orientation: 'portrait',
    platforms: ['ios', 'android'],
    icon: './assets/images/icon.png',
    scheme: getScheme(appEnv),
    userInterfaceStyle: 'automatic',
    ios: {
      ...config.ios,
      bundleIdentifier: bundleId,
      icon: './assets/expo.icon',
      supportsTablet: true,
    },
    android: {
      ...config.android,
      package: bundleId,
      adaptiveIcon: {
        backgroundColor: '#131313',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      'expo-video',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#131313',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
      autolinkingModuleResolution: true,
    },
    extra: {
      ...config.extra,
      appEnv,
      apiUrl,
      netwatchPort,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '00000000-0000-4000-8000-000000000077',
      },
    },
  };
};
