/**
 * Metro web + SPA static export; experiments.baseUrl for GitHub Pages (/repo-name/).
 *
 * Local: leave EXPO_PUBLIC_BASE_PATH unset → assets load from site root.
 * GitHub Pages: EXPO_PUBLIC_BASE_PATH=/your-repo-name (must match the repo name in the URL).
 *
 * LLM：本地用 .env；Vercel/GitHub Actions 在构建环境注入 EXPO_PUBLIC_*，
 * 并同步写入 extra，供运行时通过 expo-constants 读取（避免 Web 包未内联 process.env）。
 */
const dashscopeApiKey = (
  process.env.EXPO_PUBLIC_DASHSCOPE_API_KEY ??
  process.env.EXPO_PUBLIC_BAILIAN_API_KEY ??
  ''
).trim();

module.exports = {
  expo: {
    name: 'Moer Land',
    slug: 'more-land',
    version: '1.0.0',
    orientation: 'landscape',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    /** Fabric / Turbo 在部分真机与 Web 组合下曾出现首屏白屏；先关新架构保稳定。 */
    newArchEnabled: false,
    scheme: 'moreland',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#7a1524',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        LSApplicationQueriesSchemes: ['weixin', 'weixinULAPI'],
        NSMicrophoneUsageDescription: '用于房间内语音消息录制与发送。',
      },
    },
    android: {
      permissions: ['RECORD_AUDIO'],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#7a1524',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'single',
    },
    experiments: {
      baseUrl: process.env.EXPO_PUBLIC_BASE_PATH ?? '',
    },
    extra: {
      llmProvider: (process.env.EXPO_PUBLIC_LLM_PROVIDER ?? '').trim(),
      dashscopeApiKey,
      bailianApiKey: (process.env.EXPO_PUBLIC_BAILIAN_API_KEY ?? '').trim(),
      dashscopeModelNovice: (process.env.EXPO_PUBLIC_DASHSCOPE_MODEL_NOVICE ?? '').trim(),
      dashscopeModelEasy: (process.env.EXPO_PUBLIC_DASHSCOPE_MODEL_EASY ?? '').trim(),
      dashscopeModelMedium: (process.env.EXPO_PUBLIC_DASHSCOPE_MODEL_MEDIUM ?? '').trim(),
      dashscopeModelHard: (process.env.EXPO_PUBLIC_DASHSCOPE_MODEL_HARD ?? '').trim(),
      minimaxTtsUrl: (process.env.EXPO_PUBLIC_MINIMAX_TTS_URL ?? '').trim(),
    },
    // Zpix (~7 MB) is loaded lazily via Font.loadAsync in App.tsx after Home
    // paints. Do not list it under expo-font plugins — that eagerly embeds it
    // in the web asset graph and slows first load on Vercel.
    plugins: [],
  },
};
