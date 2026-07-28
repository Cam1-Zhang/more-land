import React, { useEffect } from 'react';
import { AppState, Platform, Text, View, type AppStateStatus, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import GameLoadingBackdrop from './src/components/GameLoadingBackdrop';
import { applyGlobalPixelFontDefaults } from './src/theme/pixelFont';
import { SDV } from './src/theme/stardewPixel';
import RootNavigator from './src/navigation/RootNavigator';

type AppErrorBoundaryState = { error: Error | null };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: '#7a1524',
            padding: 24,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff8e8', fontSize: 16, marginBottom: 12 }}>
            {Platform.OS === 'web' ? '页面加载出错' : '应用加载出错'}
          </Text>
          <Text selectable style={{ color: '#f5d0d0', fontSize: 12, lineHeight: 18 }}>
            {String(error.message)}
            {'\n\n'}
            {String(error.stack ?? '')}
          </Text>
        </View>
      );
    }
    return <>{this.props.children}</>;
  }
}

function lockLandscape() {
  if (Platform.OS === 'web') return Promise.resolve();
  return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
    () => undefined
  );
}

const rootStyle: ViewStyle =
  Platform.OS === 'web'
    ? { flex: 1, width: '100%', minHeight: '100%', height: '100%', backgroundColor: SDV.paper }
    : { flex: 1, backgroundColor: SDV.paper };

/** Hooks 与懒加载放在 Boundary 子树内，才能被 class ErrorBoundary 捕获。 */
function AppBoot() {
  // Web: never block the first route on fonts — ~4 MB JS is already the bottleneck.
  // Native: wait for the small Latin pixel font only (Zpix stays deferred).
  const [fontsLoaded, fontError] = useFonts({
    PressStart2P_400Regular,
  });
  const isWeb = Platform.OS === 'web';
  const fontReady = isWeb || fontsLoaded || fontError != null;

  useEffect(() => {
    void lockLandscape();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void lockLandscape();
      }
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || fontError) return;
    applyGlobalPixelFontDefaults();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    // Zpix is ~7 MB — defer slightly so Home paints first, but do not wait
    // 14s: night cue / moderator CJK text needs it as soon as players reach select.
    const delayMs = isWeb ? 1800 : 200;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadZpix = () => {
      if (cancelled) return;
      void import('./src/fonts/ensureZpixLoaded').then(({ ensureZpixLoaded }) => {
        void ensureZpixLoaded();
      });
    };

    if (isWeb && typeof globalThis.requestIdleCallback === 'function') {
      timer = setTimeout(() => {
        globalThis.requestIdleCallback(() => loadZpix(), { timeout: 2500 });
      }, delayMs);
    } else {
      timer = setTimeout(loadZpix, delayMs);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fontsLoaded, fontError, isWeb]);

  return (
    <View style={rootStyle}>
      {!fontReady ? <GameLoadingBackdrop /> : <RootNavigator />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AppBoot />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
