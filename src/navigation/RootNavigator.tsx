import React, { useState, useEffect, useRef } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type InitialState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, View, type ViewStyle } from 'react-native';
import { SDV } from '../theme/stardewPixel';
import {
  makeLazyScreen,
  LAZY_SCREEN_IMPORTS,
  useIdlePreloadRootScreens,
} from './lazyScreen';
import { readHubBgmEnabled, subscribeHubBgmEnabled } from '../audio/hubBgmPref';
import { readGameSfxEnabled } from '../audio/gameSfxPref';
import { clearHostRoomQueryOnWeb } from '../utils/roomInviteChannel';
// Eager hub screens — clicks must not wait on lazy CDN chunks.
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CharacterSelectScreen from '../screens/CharacterSelectScreen';

type RootStackParamList = {
  Home: undefined;
  Exploration: undefined;
  HallScene: undefined;
  Settings: undefined;
  AvatarCreator: undefined;
  Tutorial: undefined;
  CharacterSelect: undefined;
  TeamLobby: undefined;
  GameRoom: undefined;
  AvalonGameRoom: undefined;
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const NAV_STATE_PERSIST_KEY = 'ai_werewolf_nav_state_v2';

const TutorialScreen = makeLazyScreen(LAZY_SCREEN_IMPORTS.Tutorial);
const AvatarCreatorScreen = makeLazyScreen(LAZY_SCREEN_IMPORTS.AvatarCreator);
const ExplorationScreen = makeLazyScreen(LAZY_SCREEN_IMPORTS.Exploration);
const HallSceneScreen = makeLazyScreen(LAZY_SCREEN_IMPORTS.HallScene);
const TeamLobbyScreen = makeLazyScreen(LAZY_SCREEN_IMPORTS.TeamLobby);
const GameRoomScreen = makeLazyScreen(LAZY_SCREEN_IMPORTS.GameRoom);
const AvalonGameRoomScreen = makeLazyScreen(LAZY_SCREEN_IMPORTS.AvalonGameRoom);

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [activeRouteName, setActiveRouteName] = useState<string | undefined>();
  const [hubBgmEnabled, setHubBgmEnabled] = useState(false);
  const [hubBgmPrefReady, setHubBgmPrefReady] = useState(false);
  /** Web: delay persisting until we finish the non-blocking restore attempt. */
  const [navHydrated, setNavHydrated] = useState(Platform.OS !== 'web');
  const userNavigatedRef = useRef(false);
  const navReadyRef = useRef(false);

  useIdlePreloadRootScreens(Platform.OS === 'web' && navHydrated);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    clearHostRoomQueryOnWeb();

    let cancelled = false;

    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(NAV_STATE_PERSIST_KEY);
        if (cancelled) return;
        if (!saved) {
          setNavHydrated(true);
          return;
        }

        const parsed = JSON.parse(saved) as InitialState;

        const tryRestore = () => {
          if (cancelled) return;
          if (!navigationRef.isReady()) {
            requestAnimationFrame(tryRestore);
            return;
          }
          if (!userNavigatedRef.current && navigationRef.getCurrentRoute()?.name === 'Home') {
            navigationRef.resetRoot(parsed);
          }
          setNavHydrated(true);
        };

        tryRestore();
      } catch {
        await AsyncStorage.removeItem(NAV_STATE_PERSIST_KEY);
        if (!cancelled) setNavHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const enabled = await readHubBgmEnabled();
      setHubBgmEnabled(enabled);
      await readGameSfxEnabled();
      setHubBgmPrefReady(true);
    })();
    return subscribeHubBgmEnabled(setHubBgmEnabled);
  }, []);

  // Start downloading hub BGM as soon as prefs say it is on — do not wait until
  // the user notices silence. Loading stays off the UI thread / route path.
  useEffect(() => {
    if (!hubBgmPrefReady || !hubBgmEnabled) return;
    const timer = setTimeout(() => {
      void import('../audio/ambientHubBgm').then(({ preloadAmbientHubBgm }) => {
        void preloadAmbientHubBgm();
      });
    }, Platform.OS === 'web' ? 400 : 0);
    return () => clearTimeout(timer);
  }, [hubBgmEnabled, hubBgmPrefReady]);

  useEffect(() => {
    if (!hubBgmPrefReady || !activeRouteName) return;

    const run = () => {
      void import('../audio/ambientHubBgm').then(({ syncAmbientHubBgm }) => {
        void syncAmbientHubBgm(activeRouteName, hubBgmEnabled);
      });
    };

    if (Platform.OS === 'web' && hubBgmEnabled && activeRouteName === 'Home') {
      const timer = setTimeout(run, 800);
      return () => clearTimeout(timer);
    }

    run();
  }, [activeRouteName, hubBgmEnabled, hubBgmPrefReady]);

  // On character select, warm room BGM so enter-game is not silent/waiting.
  // Role-card art + GameRoom JS are preloaded from CharacterSelectScreen (knows board).
  useEffect(() => {
    if (Platform.OS !== 'web' || activeRouteName !== 'CharacterSelect') return;
    if (hubBgmEnabled) {
      void import('../audio/gameRoomBgm').then(({ preloadGameRoomBgm }) => {
        void preloadGameRoomBgm();
      });
    }
  }, [activeRouteName, hubBgmEnabled]);

  useEffect(() => {
    return () => {
      void import('../audio/ambientHubBgm').then(({ unloadAmbientHubBgm }) => {
        void unloadAmbientHubBgm();
      });
    };
  }, []);

  const rootFill: ViewStyle =
    Platform.OS === 'web'
      ? { flex: 1, width: '100%', minHeight: '100%', height: '100%' }
      : { flex: 1 };

  const persistNavState = (state: InitialState | undefined) => {
    if (Platform.OS !== 'web' || !navHydrated || !state) return;
    void AsyncStorage.setItem(NAV_STATE_PERSIST_KEY, JSON.stringify(state));
  };

  return (
    <View style={rootFill}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          navReadyRef.current = true;
          setActiveRouteName(navigationRef.getCurrentRoute()?.name);
          if (navHydrated) {
            persistNavState(navigationRef.getRootState());
          }
        }}
        onStateChange={(state) => {
          const routeName = navigationRef.getCurrentRoute()?.name;
          if (navReadyRef.current && routeName && routeName !== 'Home') {
            userNavigatedRef.current = true;
          }
          setActiveRouteName(routeName);
          persistNavState(state);
        }}
      >
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            contentStyle: [rootFill, { backgroundColor: SDV.paper }],
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Exploration" component={ExplorationScreen} />
          <Stack.Screen name="HallScene" component={HallSceneScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="AvatarCreator" component={AvatarCreatorScreen} />
          <Stack.Screen name="Tutorial" component={TutorialScreen} />
          <Stack.Screen name="CharacterSelect" component={CharacterSelectScreen} />
          <Stack.Screen name="TeamLobby" component={TeamLobbyScreen} />
          <Stack.Screen
            name="GameRoom"
            component={GameRoomScreen}
            options={{ contentStyle: [rootFill, { backgroundColor: 'transparent' }] }}
          />
          <Stack.Screen
            name="AvalonGameRoom"
            component={AvalonGameRoomScreen}
            options={{ contentStyle: [rootFill, { backgroundColor: 'transparent' }] }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
