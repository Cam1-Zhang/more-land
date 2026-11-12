import React, { Suspense, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SDV } from '../theme/stardewPixel';
import GameLoadingBackdrop from '../components/GameLoadingBackdrop';

export type LazyScreenFactory = () => Promise<{
  default: React.ComponentType<Record<string, unknown>>;
}>;

/**
 * Only heavy / less-visited routes stay lazy.
 * Settings + CharacterSelect are eagerly imported in RootNavigator so the
 * common hub clicks do not wait on a cold CDN chunk (that regression came from
 * cold-start code-splitting).
 */
export const LAZY_SCREEN_IMPORTS = {
  AvatarCreator: () => import('../screens/AvatarCreatorScreen'),
  HallScene: () => import('../screens/HallSceneScreen'),
  Exploration: () => import('../screens/MistbellScreen'),
  Tutorial: () => import('../screens/TutorialScreen'),
  TeamLobby: () => import('../screens/TeamLobbyScreen'),
  GameRoom: () => import('../screens/GameRoomScreen'),
  AvalonGameRoom: () => import('../screens/AvalonGameRoomScreen'),
} as const satisfies Record<string, LazyScreenFactory>;

/** Soft fallback: parchment tone instead of a full black takeover on route clicks. */
function SoftRouteFallback() {
  return (
    <View style={styles.softRoot} accessibilityLabel="Loading">
      <ActivityIndicator size="large" color={SDV.wood} />
    </View>
  );
}

export function makeLazyScreen(
  factory: LazyScreenFactory
): React.ComponentType<Record<string, unknown>> {
  const Lazy = React.lazy(factory);
  const Fallback = Platform.OS === 'web' ? SoftRouteFallback : GameLoadingBackdrop;
  function LazyScreenHost(props: Record<string, unknown>) {
    return (
      <Suspense fallback={<Fallback />}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  return LazyScreenHost;
}

/** Warm GameRoom / Avalon while the user is still on CharacterSelect. */
export function preloadGameEntryScreens(): void {
  if (Platform.OS !== 'web') return;
  void LAZY_SCREEN_IMPORTS.GameRoom().catch(() => undefined);
  void LAZY_SCREEN_IMPORTS.AvalonGameRoom().catch(() => undefined);
}

/**
 * After Home settles, warm the remaining lazy hub routes (not Settings /
 * CharacterSelect — those are already eager).
 */
export function useIdlePreloadRootScreens(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;

    let cancelled = false;
    let idleId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const preload = () => {
      if (cancelled) return;
      void (async () => {
        for (const factory of [
          LAZY_SCREEN_IMPORTS.Tutorial,
          LAZY_SCREEN_IMPORTS.TeamLobby,
        ]) {
          if (cancelled) return;
          try {
            await factory();
          } catch {
            /* ignore */
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      })();
    };

    timer = setTimeout(() => {
      if (typeof globalThis.requestIdleCallback === 'function') {
        idleId = globalThis.requestIdleCallback(preload, { timeout: 2000 });
      } else {
        preload();
      }
    }, 600);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (idleId != null && typeof globalThis.cancelIdleCallback === 'function') {
        globalThis.cancelIdleCallback(idleId);
      }
    };
  }, [enabled]);
}

const styles = StyleSheet.create({
  softRoot: {
    flex: 1,
    backgroundColor: SDV.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
