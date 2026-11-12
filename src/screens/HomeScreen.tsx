import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  Platform,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  homeChromeBottom,
  homeChromeLeft,
  homeChromeRight,
  homeChromeTop,
  HUB_CHROME_GAP,
} from '../utils/homeTopChromeLayout';
import { Sun, Moon, Settings, Lightbulb, Compass } from 'lucide-react-native';
import HubDayNightBackground from '../components/HubDayNightBackground';
import { GameWoodButton } from '../components/GameWoodButton';
import { HomeMenuModuleButton } from '../components/HomeMenuModuleButton';
import HomePixelBrandTitle from '../components/HomePixelBrandTitle';
import { GAME_WOOD_BTN } from '../theme/gameButton';
import { HOME_MODULE_BTN_H, HOME_MODULE_BTN_W } from '../constants/homeModuleButtonImages';
import { APP_LANGUAGE_KEY, homeCopy, type AppLanguage } from '../i18n/appStrings';
import {
  readHomeHubScene,
  writeHomeBgLights,
  writeHomeBgMode,
  type HomeBgLights,
  type HomeBgMode,
  type HomeHubScene,
} from '../utils/homeBgMode';
import { SDV } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';

/** 须为带 Alpha 的 PNG；聊天附件会变成 JPEG。本地导入：HOME_BRAND_LOGO_SRC=… npm run import:home-brand-logo */
const HOME_BRAND_LOGO = require('../../assets/homeBrandLogo.png');
const HOME_BRAND_LOGO_NATIVE_W = 1024;
const HOME_BRAND_LOGO_NATIVE_H = 576;

/** 四钮横排间距（与切图条 `homeModuleButtonsStrip` 一致） */
/** 略留间距，便于悬停放大时不叠邻格 */
const HOME_MODULE_GAP = 10;
const HOME_MODULE_ROW_W = HOME_MODULE_BTN_W * 4 + HOME_MODULE_GAP * 3;
const HOME_MODULE_PAIR_W = HOME_MODULE_BTN_W * 2 + HOME_MODULE_GAP;

/** 主页大标题字号 */
const HOME_TITLE_FONT_SIZE = 36;
/** 四模块按钮距顶（用户已调坐标，勿改） */
const HOME_GRID_MARGIN_TOP = 148;
/** 四按钮相对视口几何中心下移（px） */
const HOME_MODULE_CENTER_OFFSET_Y_PX = 102;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function HomeScreen({ navigation }: any) {
  const [lang, setLang] = useState<AppLanguage>('zh');
  /** 与 `home_bg_mode` + `home_bg_lights` 同步；默认白天关灯 */
  const [homeHubScene, setHomeHubScene] = useState<HomeHubScene>({
    mode: 'day',
    lights: 'off',
  });
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chromeTop = homeChromeTop(insets);
  const chromeRight = homeChromeRight(insets);

  /** Web：flex 链在部分浏览器里拿不到高度，底部会露黑；用 100vh 铺满视口 */
  const screenFillStyle = useMemo((): ViewStyle => {
    if (Platform.OS === 'web') {
      return {
        flex: 1,
        width: '100%',
        minHeight: '100vh' as unknown as number,
        height: '100vh' as unknown as number,
      };
    }
    return { flex: 1, width: '100%' };
  }, []);

  const load = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
      if (v === 'zh' || v === 'en') {
        setLang(v);
      } else {
        setLang('zh');
      }
    } catch {
      setLang('zh');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void readHomeHubScene().then(setHomeHubScene);
      void load();
    }, [load])
  );

  const t = homeCopy[lang];
  const viewportH = Math.max(winH - insets.top - insets.bottom, 400);
  const homeFourColumn = winW >= HOME_MODULE_ROW_W * 0.82 + 24;
  const moduleNativeW = homeFourColumn ? HOME_MODULE_ROW_W : HOME_MODULE_PAIR_W;
  const moduleRowsH = homeFourColumn ? HOME_MODULE_BTN_H : HOME_MODULE_BTN_H * 2 + HOME_MODULE_GAP;
  const moduleScale = clamp(
    Math.min((winW - 32) / moduleNativeW, (viewportH * 0.34) / moduleRowsH),
    0.62,
    1
  );
  const gridMaxW = moduleNativeW * moduleScale;
  const homeBrandLogoW = Math.min(winW - 32, HOME_MODULE_ROW_W + 48);
  const homeBrandLogoH = Math.round(
    (homeBrandLogoW * HOME_BRAND_LOGO_NATIVE_H) / HOME_BRAND_LOGO_NATIVE_W
  );
  const homeBrandMarginTop = clamp(viewportH * 0.16, 72, HOME_GRID_MARGIN_TOP);
  const moduleCenterOffsetY = clamp(
    HOME_MODULE_CENTER_OFFSET_Y_PX * moduleScale,
    58,
    HOME_MODULE_CENTER_OFFSET_Y_PX
  );

  const { mode: homeBgMode, lights: homeBgLights } = homeHubScene;

  return (
    <SafeAreaView style={[styles.safeRoot, screenFillStyle]}>
      <StatusBar barStyle={homeBgMode === 'day' ? 'dark-content' : 'light-content'} />
      <HubDayNightBackground scene={homeHubScene} style={[styles.bg, screenFillStyle]}>
        <View style={[styles.bgStack, screenFillStyle]}>
          <View style={[styles.topRightCluster, { top: chromeTop, right: chromeRight }]}>
            <GameWoodButton
              variant="text"
              label={lang === 'zh' ? '探索' : 'Explore'}
              leftIcon={<Compass size={20} color={GAME_WOOD_BTN.text} />}
              onPress={() => navigation.navigate('Exploration')}
              compact
            />
            <GameWoodButton
              variant="icon"
              onPress={() => navigation.navigate('Settings')}
              accessibilityLabel={t.settingsTitle}
            >
              <Settings size={22} color={GAME_WOOD_BTN.text} strokeWidth={2.4} />
            </GameWoodButton>
            <GameWoodButton
              variant="icon"
              onPress={() =>
                setHomeHubScene((s) => {
                  const nextMode: HomeBgMode = s.mode === 'day' ? 'night' : 'day';
                  void writeHomeBgMode(nextMode);
                  return { ...s, mode: nextMode };
                })
              }
              accessibilityLabel={t.homeBgToggle}
            >
              {homeBgMode === 'day' ? (
                <Sun
                  size={20}
                  color="#f0c030"
                  strokeWidth={2.5}
                  fill="rgba(240,192,48,0.28)"
                />
              ) : (
                <Moon
                  size={20}
                  color="#d4dcff"
                  strokeWidth={2.4}
                  fill="rgba(180,195,255,0.22)"
                />
              )}
            </GameWoodButton>
          </View>

          <View
            style={[
              styles.bottomLeftCluster,
              { bottom: homeChromeBottom(insets), left: homeChromeLeft(insets) },
            ]}
          >
            <TouchableOpacity
              style={styles.homeLightsIconBtn}
              onPress={() =>
                setHomeHubScene((s) => {
                  const nextLights: HomeBgLights = s.lights === 'on' ? 'off' : 'on';
                  void writeHomeBgLights(nextLights);
                  return { ...s, lights: nextLights };
                })
              }
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={
                homeBgLights === 'on' ? t.homeBgLightsOff : t.homeBgLightsOn
              }
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Lightbulb
                size={24}
                color={homeBgLights === 'on' ? '#ffe08a' : GAME_WOOD_BTN.text}
                strokeWidth={2.4}
                fill={homeBgLights === 'on' ? 'rgba(255, 224, 138, 0.45)' : 'transparent'}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollInner,
              {
                minHeight: viewportH,
                paddingBottom: Math.max(insets.bottom, 16) + 16,
                flexGrow: 1,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
          <View
            style={[
              styles.homePageColumn,
              { minHeight: viewportH },
            ]}
          >
            <View style={[styles.homeBrandSlot, { marginTop: homeBrandMarginTop }]}>
              <View
                style={[
                  styles.logoTitleLayer,
                  { width: homeBrandLogoW, height: homeBrandLogoH },
                ]}
              >
                <Image
                  source={HOME_BRAND_LOGO}
                  style={[PIXEL_ART_SPRITE, styles.logoImage]}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={t.brandSubtitle}
                />
                <View style={styles.titleOnLogo} pointerEvents="none">
                  <HomePixelBrandTitle
                    layoutWidth={Math.max(homeBrandLogoW, HOME_MODULE_ROW_W, gridMaxW)}
                    fontSize={HOME_TITLE_FONT_SIZE}
                    overlay
                  />
                </View>
              </View>
            </View>
          </View>
          </ScrollView>

          <View style={styles.homeModuleCenter} pointerEvents="box-none">
            <View
              style={[
                styles.homeModuleCenterInner,
                {
                  width: moduleNativeW * moduleScale,
                  height: moduleRowsH * moduleScale,
                  transform: [{ translateY: moduleCenterOffsetY }],
                },
              ]}
            >
              <View
                style={[
                  styles.grid,
                  {
                    maxWidth: moduleNativeW,
                    width: homeFourColumn ? HOME_MODULE_ROW_W : HOME_MODULE_PAIR_W,
                    transform: [{ scale: moduleScale }],
                  },
                ]}
              >
                {homeFourColumn ? (
                  <View style={[styles.gridRow, styles.gridRowFour]}>
                    <HomeMenuModuleButton
                      module="single"
                      accessibilityLabel={t.singleTitle}
                      onPress={() => navigation.navigate('CharacterSelect')}
                    />
                    <HomeMenuModuleButton
                      module="team"
                      accessibilityLabel={t.teamLobbyTitle}
                      onPress={() => navigation.navigate('TeamLobby')}
                    />
                    <HomeMenuModuleButton
                      module="tutorial"
                      accessibilityLabel={t.tutorialTitle}
                      onPress={() => navigation.navigate('Tutorial')}
                    />
                    <HomeMenuModuleButton
                      module="gallery"
                      accessibilityLabel={t.galleryTitle}
                      onPress={() =>
                        navigation.navigate('CharacterSelect', { galleryOnly: true })
                      }
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.gridRow}>
                      <HomeMenuModuleButton
                        module="single"
                        accessibilityLabel={t.singleTitle}
                        onPress={() => navigation.navigate('CharacterSelect')}
                      />
                      <View style={styles.tileGap} />
                      <HomeMenuModuleButton
                        module="team"
                        accessibilityLabel={t.teamLobbyTitle}
                        onPress={() => navigation.navigate('TeamLobby')}
                      />
                    </View>
                    <View style={styles.gridRowSpacer} />
                    <View style={styles.gridRow}>
                      <HomeMenuModuleButton
                        module="tutorial"
                        accessibilityLabel={t.tutorialTitle}
                        onPress={() => navigation.navigate('Tutorial')}
                      />
                      <View style={styles.tileGap} />
                      <HomeMenuModuleButton
                        module="gallery"
                        accessibilityLabel={t.galleryTitle}
                        onPress={() =>
                          navigation.navigate('CharacterSelect', { galleryOnly: true })
                        }
                      />
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </HubDayNightBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: '#0f0d14' },
  /** cover；高度由 screenFillStyle 与 imageStyle 与视口对齐，避免 Web 底部露黑 */
  bg: {
    backgroundColor: '#0f0d14',
  },
  bgStack: { flex: 1, position: 'relative' },
  scroll: { flex: 1, alignSelf: 'stretch' },
  scrollInner: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  topRightCluster: {
    position: 'absolute',
    zIndex: 20,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: HUB_CHROME_GAP,
  },
  bottomLeftCluster: {
    position: 'absolute',
    zIndex: 20,
    elevation: 8,
  },
  homeLightsIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  homePageColumn: {
    width: '100%',
    alignItems: 'center',
  },
  homeBrandSlot: {
    alignSelf: 'center',
    marginTop: HOME_GRID_MARGIN_TOP,
    alignItems: 'center',
    zIndex: 1,
  },
  /** 相对 bgStack / 视口居中，不受 ScrollView 内 LOGO 撑高影响 */
  homeModuleCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  homeModuleCenterInner: {
    alignItems: 'center',
  },
  logoTitleLayer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleOnLogo: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    overflow: 'visible',
  },
  grid: { alignSelf: 'center' },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRowFour: { gap: HOME_MODULE_GAP },
  gridRowSpacer: { height: HOME_MODULE_GAP },
  tileGap: { width: HOME_MODULE_GAP },
});
