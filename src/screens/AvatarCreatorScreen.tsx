import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ChevronLeft, Sparkles } from 'lucide-react-native';
import { APP_LANGUAGE_KEY, type AppLanguage } from '../i18n/appStrings';
import PixelAvatarSprite from '../components/PixelAvatarSprite';
import { GameWoodButton } from '../components/GameWoodButton';
import HubDayNightBackground from '../components/HubDayNightBackground';
import {
  AVATAR_BODY_TYPES,
  AVATAR_ACCESSORY_OPTIONS,
  AVATAR_BOTTOM_OPTIONS,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_OPTIONS,
  AVATAR_SHOE_OPTIONS,
  AVATAR_SKIN_OPTIONS,
  AVATAR_TOP_OPTIONS,
  DEFAULT_AVATAR_BY_BODY_TYPE,
  DEFAULT_PIXEL_AVATAR_CONFIG,
  USER_PIXEL_AVATAR_CONFIG_KEY,
  USER_PIXEL_AVATAR_TRANSFORMS_KEY,
  optionsForBody,
  parsePixelAvatarConfig,
  type AvatarBodyType,
  type AvatarHairColor,
  type PixelAvatarConfig,
} from '../constants/avatarCreator';
import { GAME_WOOD_BTN, PICKER_GLASS_PANEL_BG, PICKER_GLASS_PANEL_BORDER } from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';

const GLASS_INNER_BG = 'rgba(255, 255, 255, 0.55)' as const;
const CONTENT_MAX_W = 920;
const PREVIEW_SIZE = 128;
const PREVIEW_HEIGHT = PREVIEW_SIZE * 1.5;

const COPY = {
  zh: {
    title: '个人形象',
    subtitle: 'Avatar Creator',
    back: '返回设置',
    save: '保存形象',
    cancel: '取消',
    reset: '重置默认',
    body: '体型',
    skin: '肤色',
    hairStyle: '发型',
    hairColor: '发色',
    top: '上衣',
    bottom: '裤子 / 下装',
    shoes: '鞋子',
    accessory: '配饰',
    none: '无',
  },
  en: {
    title: 'Avatar Creator',
    subtitle: 'Pixel character layers',
    back: 'Back to settings',
    save: 'Save avatar',
    cancel: 'Cancel',
    reset: 'Reset default',
    body: 'Body',
    skin: 'Skin tone',
    hairStyle: 'Hair',
    hairColor: 'Hair color',
    top: 'Top',
    bottom: 'Bottom',
    shoes: 'Shoes',
    accessory: 'Accessory',
    none: 'None',
  },
} as const;

function prettyOption(value: string, lang: AppLanguage, noneLabel: string): string {
  if (value === 'none') return noneLabel;
  const names: Record<string, string> = {
    skin_01: lang === 'zh' ? '肤色 1' : 'Skin 1',
    skin_02: lang === 'zh' ? '肤色 2' : 'Skin 2',
    skin_03: lang === 'zh' ? '肤色 3' : 'Skin 3',
    skin_04: lang === 'zh' ? '肤色 4' : 'Skin 4',
    skin_05: lang === 'zh' ? '肤色 5' : 'Skin 5',
    skin_06: lang === 'zh' ? '肤色 6' : 'Skin 6',
    male: lang === 'zh' ? '男生' : 'Male',
    female: lang === 'zh' ? '女生' : 'Female',
  };
  const numbered = /_(\d{2})$/.exec(value);
  if (value.includes('_hair_') && numbered) return lang === 'zh' ? `发型 ${Number(numbered[1])}` : `Hair ${Number(numbered[1])}`;
  if (value.includes('_top_') && numbered) return lang === 'zh' ? `上衣 ${Number(numbered[1])}` : `Top ${Number(numbered[1])}`;
  if (value.includes('_bottom_') && numbered) return lang === 'zh' ? `下装 ${Number(numbered[1])}` : `Bottom ${Number(numbered[1])}`;
  if (value.includes('_shoes_') && numbered) return lang === 'zh' ? `鞋子 ${Number(numbered[1])}` : `Shoes ${Number(numbered[1])}`;
  if (value.includes('_accessory_') && numbered) return lang === 'zh' ? `配饰 ${Number(numbered[1])}` : `Accessory ${Number(numbered[1])}`;
  return names[value] ?? value;
}

function OptionGroup<T extends string>({
  title,
  values,
  value,
  onChange,
  lang,
  noneLabel,
}: {
  title: string;
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  lang: AppLanguage;
  noneLabel: string;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionTitle}>{title}</Text>
      <View style={styles.optionGrid}>
        {values.map((item) => {
          const selected = item === value;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.optionChip, selected && styles.optionChipOn]}
              onPress={() => onChange(item)}
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel={prettyOption(item, lang, noneLabel)}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.optionChipText, selected && styles.optionChipTextOn]}>
                {prettyOption(item, lang, noneLabel)}
              </Text>
              {selected ? <Check size={12} color="#fff8ec" strokeWidth={3} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ColorGroup({
  title,
  value,
  onChange,
}: {
  title: string;
  value: AvatarHairColor;
  onChange: (value: AvatarHairColor) => void;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionTitle}>{title}</Text>
      <View style={styles.colorGrid}>
        {AVATAR_HAIR_COLORS.map((item) => {
          const selected = item.id === value;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.colorChip, selected && styles.colorChipOn]}
              onPress={() => onChange(item.id)}
              activeOpacity={0.84}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={[styles.colorSwatch, { backgroundColor: item.id }]} />
              {selected ? <Check size={12} color="#fff8ec" strokeWidth={3} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AvatarCreatorScreen({ navigation }: any) {
  const { width: screenW } = useWindowDimensions();
  const [lang, setLang] = useState<AppLanguage>('zh');
  const [config, setConfig] = useState<PixelAvatarConfig>(DEFAULT_PIXEL_AVATAR_CONFIG);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        setReady(false);
        const [rawLang, rawAvatar] = await Promise.all([
          AsyncStorage.getItem(APP_LANGUAGE_KEY),
          AsyncStorage.getItem(USER_PIXEL_AVATAR_CONFIG_KEY),
        ]);
        if (cancelled) return;
        setLang(rawLang === 'en' ? 'en' : 'zh');
        const nextConfig = parsePixelAvatarConfig(rawAvatar) ?? DEFAULT_PIXEL_AVATAR_CONFIG;
        setConfig(nextConfig);
        setReady(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const update = <K extends keyof PixelAvatarConfig>(key: K, value: PixelAvatarConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateBodyType = (bodyType: AvatarBodyType) => {
    setConfig((prev) => ({
      ...DEFAULT_AVATAR_BY_BODY_TYPE[bodyType],
      skinTone: prev.skinTone,
      hairColor: prev.hairColor,
    }));
  };

  const resetDefault = () => {
    setConfig(DEFAULT_AVATAR_BY_BODY_TYPE[config.bodyType]);
  };

  const save = async () => {
    await Promise.all([
      AsyncStorage.setItem(USER_PIXEL_AVATAR_CONFIG_KEY, JSON.stringify(config)),
      AsyncStorage.setItem(USER_PIXEL_AVATAR_TRANSFORMS_KEY, JSON.stringify({})),
    ]);
    navigation.goBack();
  };

  const t = COPY[lang];
  const contentW = Math.min(screenW - 32, CONTENT_MAX_W);
  const skinOptions = optionsForBody(AVATAR_SKIN_OPTIONS, config.bodyType).map((o) => o.id);
  const hairOptions = optionsForBody(AVATAR_HAIR_OPTIONS, config.bodyType).map((o) => o.id);
  const topOptions = optionsForBody(AVATAR_TOP_OPTIONS, config.bodyType).map((o) => o.id);
  const bottomOptions = optionsForBody(AVATAR_BOTTOM_OPTIONS, config.bodyType).map((o) => o.id);
  const shoeOptions = optionsForBody(AVATAR_SHOE_OPTIONS, config.bodyType).map((o) => o.id);
  const accessoryOptions = [
    'none' as const,
    ...optionsForBody(AVATAR_ACCESSORY_OPTIONS, config.bodyType).map((o) => o.id),
  ];

  if (!ready) {
    return (
      <HubDayNightBackground style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <StatusBar barStyle="dark-content" />
          <ActivityIndicator size="large" color={SDV.wood} />
        </SafeAreaView>
      </HubDayNightBackground>
    );
  }

  return (
    <HubDayNightBackground style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.pageBody}>
          <View style={[styles.mainShell, { maxWidth: contentW }]}>
            <View style={styles.header}>
              <GameWoodButton
                variant="icon"
                onPress={() => navigation.goBack()}
                accessibilityLabel={t.back}
              >
                <ChevronLeft color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
              </GameWoodButton>
              <View style={styles.headerCenter}>
                <Text style={styles.pageTitle}>{t.title}</Text>
                <Text style={styles.pageSubtitle}>{t.subtitle}</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.previewPanel}>
                <View style={styles.previewStage}>
                  <View style={styles.avatarCanvas}>
                    <PixelAvatarSprite config={config} size={PREVIEW_SIZE} />
                  </View>
                </View>
              </View>

              <View style={styles.editorPanel}>
                <View style={styles.editorHeader}>
                  <Sparkles size={17} color={SDV.ink} strokeWidth={2.2} />
                  <Text style={styles.editorTitle}>{t.title}</Text>
                </View>

                <OptionGroup
                  title={t.body}
                  values={AVATAR_BODY_TYPES}
                  value={config.bodyType}
                  onChange={updateBodyType}
                  lang={lang}
                  noneLabel={t.none}
                />
                <OptionGroup
                  title={t.skin}
                  values={skinOptions}
                  value={config.skinTone}
                  onChange={(v) => update('skinTone', v)}
                  lang={lang}
                  noneLabel={t.none}
                />
                <OptionGroup
                  title={t.hairStyle}
                  values={hairOptions}
                  value={config.hairStyle}
                  onChange={(v) => update('hairStyle', v)}
                  lang={lang}
                  noneLabel={t.none}
                />
                <ColorGroup
                  title={t.hairColor}
                  value={config.hairColor}
                  onChange={(v) => update('hairColor', v)}
                />
                <OptionGroup
                  title={t.top}
                  values={topOptions}
                  value={config.top}
                  onChange={(v) => update('top', v)}
                  lang={lang}
                  noneLabel={t.none}
                />
                <OptionGroup
                  title={t.bottom}
                  values={bottomOptions}
                  value={config.bottom}
                  onChange={(v) => update('bottom', v)}
                  lang={lang}
                  noneLabel={t.none}
                />
                <OptionGroup
                  title={t.shoes}
                  values={shoeOptions}
                  value={config.shoes}
                  onChange={(v) => update('shoes', v)}
                  lang={lang}
                  noneLabel={t.none}
                />
                <OptionGroup
                  title={t.accessory}
                  values={accessoryOptions}
                  value={config.accessory}
                  onChange={(v) => update('accessory', v)}
                  lang={lang}
                  noneLabel={t.none}
                />
              </View>

              <View style={styles.actions}>
                <GameWoodButton
                  variant="text"
                  compact
                  tone="outline"
                  label={t.cancel}
                  onPress={() => navigation.goBack()}
                />
                <GameWoodButton
                  variant="text"
                  compact
                  tone="outline"
                  label={t.reset}
                  onPress={resetDefault}
                />
                <GameWoodButton variant="text" wide label={`✦ ${t.save} ✦`} onPress={() => void save()} />
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </HubDayNightBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  pageBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: 'center',
  },
  mainShell: {
    flex: 1,
    width: '100%',
    backgroundColor: PICKER_GLASS_PANEL_BG,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(74, 55, 40, 0.12)',
  },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
  headerSpacer: { width: 44, flexShrink: 0 },
  pageTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: SDV.ink,
  },
  pageSubtitle: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '700',
    color: SDV.subtext,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 30,
  },
  previewPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS_INNER_BG,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  calibrationTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: SDV.ink,
  },
  calibrationHint: {
    maxWidth: 440,
    marginTop: 5,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '700',
    color: SDV.subtext,
  },
  layerTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 12,
  },
  layerTab: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 150, 100, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  layerTabOn: {
    borderColor: '#c9a040',
    backgroundColor: SDV.wood,
  },
  layerTabText: {
    fontSize: 11,
    fontWeight: '900',
    color: SDV.ink,
  },
  layerTabTextOn: {
    color: '#fff8ec',
  },
  previewStage: {
    width: 190,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(150, 120, 78, 0.28)',
    backgroundColor: 'rgba(255, 250, 238, 0.7)',
    borderRadius: 8,
    overflow: 'visible',
  },
  avatarCanvas: {
    width: PREVIEW_SIZE,
    height: PREVIEW_HEIGHT,
    position: 'relative',
  },
  selectionBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#e9a51b',
    borderStyle: 'dashed',
    minWidth: 12,
    minHeight: 12,
  },
  moveSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 190, 50, 0.025)',
    cursor: 'move',
  },
  resizeHandle: {
    position: 'absolute',
    right: -11,
    bottom: -11,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff7df',
    backgroundColor: '#c97b22',
    cursor: 'nwse-resize',
  },
  resizeHandleGlyph: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '900',
  },
  transformReadout: {
    marginTop: 13,
    alignItems: 'center',
    gap: 8,
  },
  transformReadoutText: {
    color: SDV.subtext,
    fontSize: 10,
    fontWeight: '800',
  },
  resetLayerButton: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(150, 112, 65, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  resetLayerButtonText: {
    color: SDV.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  editorPanel: {
    backgroundColor: GLASS_INNER_BG,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  editorTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: SDV.ink,
  },
  optionGroup: {
    paddingTop: 12,
  },
  optionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: SDV.subtext,
    marginBottom: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 150, 100, 0.4)',
    backgroundColor: GLASS_INNER_BG,
  },
  optionChipOn: {
    backgroundColor: SDV.wood,
    borderColor: '#c9a040',
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: SDV.ink,
  },
  optionChipTextOn: {
    color: '#fff8ec',
  },
  colorChip: {
    width: 42,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 150, 100, 0.4)',
    backgroundColor: GLASS_INNER_BG,
  },
  colorChipOn: {
    backgroundColor: SDV.wood,
    borderColor: '#c9a040',
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(60, 45, 32, 0.35)',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 2,
  },
});
