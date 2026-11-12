import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  Globe,
  User,
  Package,
  Music2,
  Cloud,
  Terminal,
  Pencil,
  Check,
  Info,
  Volume2,
  MessageCircle,
  Star,
  ChevronLeft,
} from 'lucide-react-native';
import { APP_LANGUAGE_KEY, homeCopy, type AppLanguage } from '../i18n/appStrings';
import {
  USER_AVATAR_INDEX_KEY,
  USER_NICKNAME_KEY,
  USER_NICKNAME_MAX_LEN,
  CLOUD_MODEL_ENABLED_KEY,
} from '../constants/userProfileKeys';
import { applyHubBgmEnabled, readHubBgmEnabled, subscribeHubBgmEnabled } from '../audio/hubBgmPref';
import { readGameSfxEnabled, writeGameSfxEnabled } from '../audio/gameSfxPref';
import { readAiVoiceEnabled, writeAiVoiceEnabled } from '../audio/aiVoicePref';
import { stopAiSpeech } from '../utils/aiVoice';
import {
  getChibiAvatarByIndex,
  HUMAN_CHIBI_COUNT,
} from '../constants/characterAvatarImages';
import { GameWoodButton } from '../components/GameWoodButton';
import {
  GAME_WOOD_BTN,
  PICKER_GLASS_PANEL_BG,
  PICKER_GLASS_PANEL_BORDER,
} from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import { setRuntimeLlmProviderOverride } from '../llm/providerEnv';
import HubDayNightBackground from '../components/HubDayNightBackground';
import PixelAvatarSprite from '../components/PixelAvatarSprite';
import { USER_PIXEL_AVATAR_CONFIG_KEY, parsePixelAvatarConfig, type PixelAvatarConfig } from '../constants/avatarCreator';

const GLASS_INNER_BG = 'rgba(255, 255, 255, 0.55)' as const;
const SETTINGS_SHELL_MAX_W = 1120;
const SETTINGS_CONTENT_MAX_W = 720;

function SettingsSection({
  icon,
  title,
  headerRight,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionTopRow, !children && styles.sectionTopRowOnly]}>
        <View style={styles.sectionLabel}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

function ParchmentSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: 'rgba(200, 180, 150, 0.6)', true: '#d4a84a' }}
      thumbColor="#fffef8"
      ios_backgroundColor="rgba(200, 180, 150, 0.5)"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export default function SettingsScreen({ navigation }: any) {
  const { width: screenW } = useWindowDimensions();
  const contentW = Math.min(screenW - 32, SETTINGS_CONTENT_MAX_W);

  const [lang, setLang] = useState<AppLanguage>('zh');
  const [draftNick, setDraftNick] = useState('');
  const [draftAvatar, setDraftAvatar] = useState(3);
  const [pixelAvatar, setPixelAvatar] = useState<PixelAvatarConfig | null>(null);
  const [cloudModelEnabled, setCloudModelEnabled] = useState(true);
  const [hubBgmEnabled, setHubBgmEnabled] = useState(false);
  const [gameSfxEnabled, setGameSfxEnabled] = useState(true);
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  const hydrate = useCallback(async () => {
    // Keep previous UI visible while refreshing prefs — avoid a second spinner
    // after the lazy chunk already painted.
    try {
      const [rawLang, n, a, cloudRaw, hubOn, sfxOn, voiceOn, rawPixel] = await Promise.all([
        AsyncStorage.getItem(APP_LANGUAGE_KEY),
        AsyncStorage.getItem(USER_NICKNAME_KEY),
        AsyncStorage.getItem(USER_AVATAR_INDEX_KEY),
        AsyncStorage.getItem(CLOUD_MODEL_ENABLED_KEY),
        readHubBgmEnabled(),
        readGameSfxEnabled(),
        readAiVoiceEnabled(),
        AsyncStorage.getItem(USER_PIXEL_AVATAR_CONFIG_KEY),
      ]);
      const L: AppLanguage = rawLang === 'en' ? 'en' : 'zh';
      setLang(L);
      setPixelAvatar(parsePixelAvatarConfig(rawPixel));
      const idx = parseInt(a ?? '', 10);
      setDraftNick(n ?? '');
      setDraftAvatar(
        Number.isFinite(idx) && idx >= 0 && idx < HUMAN_CHIBI_COUNT ? idx : 3
      );
      const cloudOn = cloudRaw !== 'false';
      setCloudModelEnabled(cloudOn);
      setRuntimeLlmProviderOverride(cloudOn ? null : 'ollama');
      setHubBgmEnabled(hubOn);
      setGameSfxEnabled(sfxOn);
      setAiVoiceEnabled(voiceOn);
    } finally {
      setReady(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate])
  );

  useEffect(() => subscribeHubBgmEnabled(setHubBgmEnabled), []);

  const saveProfile = async () => {
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, lang);
    const trimmed = draftNick.trim().slice(0, USER_NICKNAME_MAX_LEN);
    if (trimmed.length > 0) {
      await AsyncStorage.setItem(USER_NICKNAME_KEY, trimmed);
    } else {
      await AsyncStorage.removeItem(USER_NICKNAME_KEY);
    }
    await AsyncStorage.setItem(USER_AVATAR_INDEX_KEY, String(draftAvatar));
    await AsyncStorage.setItem(CLOUD_MODEL_ENABLED_KEY, cloudModelEnabled ? 'true' : 'false');
    await applyHubBgmEnabled(hubBgmEnabled, 'Settings');
    await writeGameSfxEnabled(gameSfxEnabled);
    await writeAiVoiceEnabled(aiVoiceEnabled);
    setRuntimeLlmProviderOverride(cloudModelEnabled ? null : 'ollama');
    navigation.goBack();
  };

  const toggleHubBgm = async (next: boolean) => {
    setHubBgmEnabled(next);
    await applyHubBgmEnabled(next, 'Settings');
  };

  const toggleGameSfx = async (next: boolean) => {
    setGameSfxEnabled(next);
    await writeGameSfxEnabled(next);
  };

  const toggleAiVoice = async (next: boolean) => {
    setAiVoiceEnabled(next);
    await writeAiVoiceEnabled(next);
    if (!next) void stopAiSpeech();
  };

  const t = homeCopy[lang];
  const iconColor = SDV.ink;
  const iconSize = 18;

  const langSegment = (
    <View style={styles.langBar}>
      <TouchableOpacity
        style={[styles.langCell, lang === 'zh' && styles.langCellOn]}
        onPress={() => setLang('zh')}
        activeOpacity={0.85}
      >
        {lang === 'zh' ? (
          <Star size={11} color={SDV.honey} fill={SDV.honey} style={styles.langStar} />
        ) : null}
        <Text style={[styles.langCellText, lang === 'zh' && styles.langCellTextOn]}>
          {t.settingsLangZh}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langCell, lang === 'en' && styles.langCellOn]}
        onPress={() => setLang('en')}
        activeOpacity={0.85}
      >
        <Text style={[styles.langCellText, lang === 'en' && styles.langCellTextOn]}>
          {t.settingsLangEn}
        </Text>
      </TouchableOpacity>
    </View>
  );

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

  const shellW = Math.min(screenW - 28, SETTINGS_SHELL_MAX_W);

  return (
    <HubDayNightBackground style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.pageBody}>
          <View style={[styles.pageBodyInner, { maxWidth: shellW }]}>
            <View style={styles.mainShell}>
              <View style={styles.settingsChromeHeader}>
                <GameWoodButton
                  variant="icon"
                  onPress={() => navigation.goBack()}
                  accessibilityLabel={t.settingsBack}
                >
                  <ChevronLeft color={GAME_WOOD_BTN.text} size={22} strokeWidth={2.5} />
                </GameWoodButton>
                <View style={styles.settingsHeaderCenter}>
                  <Text style={styles.pageTitle}>{t.settingsTitle}</Text>
                  <Text style={styles.pageSubtitle}>{t.settingsSubtitle}</Text>
                </View>
                <View style={styles.settingsHeaderSpacer} />
              </View>

              <ScrollView
                style={styles.settingsPanelScroll}
                contentContainerStyle={styles.settingsPanelScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.contentColumn, { width: contentW, maxWidth: contentW }]}>
            <SettingsSection
              icon={<Globe size={iconSize} color={iconColor} strokeWidth={2.2} />}
              title={t.settingsGameLang}
              headerRight={langSegment}
            />

            <SettingsSection
              icon={<User size={iconSize} color={iconColor} strokeWidth={2.2} />}
              title={t.settingsPersonal}
            >
              <View
                style={[
                  styles.personalRow,
                  contentW < 520 && styles.personalRowStacked,
                ]}
              >
                <View style={styles.personalColNick}>
                  <Text style={styles.fieldLabel}>{t.settingsNickname}</Text>
                  <View style={styles.nickRow}>
                    <User size={16} color={SDV.inkMuted} strokeWidth={2} />
                    <TextInput
                      style={styles.nickInput}
                      value={draftNick}
                      onChangeText={(v) => setDraftNick(v.slice(0, USER_NICKNAME_MAX_LEN))}
                      placeholder={t.settingsNicknamePlaceholder}
                      placeholderTextColor={SDV.inkMuted}
                      maxLength={USER_NICKNAME_MAX_LEN}
                    />
                    <Pencil size={14} color={SDV.inkMuted} strokeWidth={2} />
                  </View>
                </View>
                <View style={styles.personalColAvatar}>
                  <Text style={styles.fieldLabel}>{lang === 'zh' ? '个人形象' : 'Your character'}</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={lang === 'zh' ? '选择个人形象' : 'Choose your character'}
                    onPress={() => navigation.navigate('AvatarCreator')} style={styles.creatorEntry}>
                    <View style={styles.creatorPortrait}>
                      {pixelAvatar ? <PixelAvatarSprite config={pixelAvatar} size={48} /> : <Image source={getChibiAvatarByIndex(draftAvatar)} style={[PIXEL_ART_SPRITE, { width: 48, height: 64 }]} resizeMode="contain" />}
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text style={styles.creatorTitle}>{lang === 'zh' ? '选择形象' : 'Choose a character'}</Text>
                      <Text style={styles.creatorHint}>{lang === 'zh' ? '男女各三款：亚比、可爱、正常风。' : 'Alternative, cute and everyday styles.'}</Text>
                    </View>
                    <Pencil size={18} color={SDV.wood} />
                  </TouchableOpacity>
                </View>
              </View>
            </SettingsSection>

            <SettingsSection
              icon={<Package size={iconSize} color={iconColor} strokeWidth={2.2} />}
              title={t.settingsModelSource}
            >
              <View style={styles.modelRow}>
                <TouchableOpacity
                  style={[styles.modelCard, cloudModelEnabled && styles.modelCardOn]}
                  onPress={() => setCloudModelEnabled(true)}
                  activeOpacity={0.85}
                >
                  {cloudModelEnabled ? (
                    <View style={styles.modelCardCheck}>
                      <Check size={11} color="#fff9e8" strokeWidth={3} />
                    </View>
                  ) : null}
                  <Cloud size={24} color={SDV.ink} strokeWidth={2} />
                  <Text style={styles.modelCardTitle}>{t.settingsCloudModel}</Text>
                  <Text style={styles.modelCardDesc}>{t.settingsCloudModelDesc}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modelCard, !cloudModelEnabled && styles.modelCardOn]}
                  onPress={() => setCloudModelEnabled(false)}
                  activeOpacity={0.85}
                >
                  {!cloudModelEnabled ? (
                    <View style={styles.modelCardCheck}>
                      <Check size={11} color="#fff9e8" strokeWidth={3} />
                    </View>
                  ) : null}
                  <Terminal size={24} color={SDV.ink} strokeWidth={2} />
                  <Text style={styles.modelCardTitle}>{t.settingsLocalModel}</Text>
                  <Text style={styles.modelCardDesc}>{t.settingsLocalModelDesc}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modelHintRow}>
                <Info size={12} color={SDV.subtext} strokeWidth={2} />
                <Text style={styles.modelHint}>{t.settingsModelHint}</Text>
              </View>
            </SettingsSection>

            <SettingsSection
              icon={<Music2 size={iconSize} color={iconColor} strokeWidth={2.2} />}
              title={t.settingsSound}
            >
              <View style={styles.soundRow}>
                <View style={styles.soundIconWrap}>
                  <Music2 size={17} color={SDV.ink} strokeWidth={2.2} />
                </View>
                <View style={styles.soundTextCol}>
                  <Text style={styles.soundTitle}>{t.settingsMusic}</Text>
                  <Text style={styles.soundHint}>{t.settingsMusicHint}</Text>
                </View>
                <ParchmentSwitch
                  value={hubBgmEnabled}
                  onValueChange={(v) => void toggleHubBgm(v)}
                  accessibilityLabel={hubBgmEnabled ? t.settingsBgmOn : t.settingsBgmOff}
                />
              </View>
              <View style={styles.soundDivider} />
              <View style={styles.soundRow}>
                <View style={styles.soundIconWrap}>
                  <MessageCircle size={17} color={SDV.ink} strokeWidth={2.2} />
                </View>
                <View style={styles.soundTextCol}>
                  <Text style={styles.soundTitle}>{t.settingsAiVoice}</Text>
                  <Text style={styles.soundHint}>{t.settingsAiVoiceHint}</Text>
                </View>
                <ParchmentSwitch
                  value={aiVoiceEnabled}
                  onValueChange={(v) => void toggleAiVoice(v)}
                  accessibilityLabel={aiVoiceEnabled ? t.settingsAiVoiceOn : t.settingsAiVoiceOff}
                />
              </View>
              <View style={styles.soundDivider} />
              <View style={styles.soundRow}>
                <View style={styles.soundIconWrap}>
                  <Volume2 size={17} color={SDV.ink} strokeWidth={2.2} />
                </View>
                <View style={styles.soundTextCol}>
                  <Text style={styles.soundTitle}>{t.settingsSfx}</Text>
                  <Text style={styles.soundHint}>{t.settingsSfxHint}</Text>
                </View>
                <ParchmentSwitch
                  value={gameSfxEnabled}
                  onValueChange={(v) => void toggleGameSfx(v)}
                  accessibilityLabel={gameSfxEnabled ? t.settingsSfxOn : t.settingsSfxOff}
                />
              </View>
            </SettingsSection>

            <View style={styles.actions}>
              <GameWoodButton
                variant="text"
                compact
                tone="outline"
                label={t.settingsCancel}
                onPress={() => navigation.goBack()}
                style={styles.cancelBtn}
              />
              <GameWoodButton
                variant="text"
                wide
                label={`✦ ${t.settingsSave} ✦`}
                onPress={() => void saveProfile()}
                style={styles.saveBtn}
              />
            </View>
                </View>
              </ScrollView>
            </View>
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
    minHeight: 0,
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  pageBodyInner: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'center',
  },
  /** 与选人/图鉴 `mainShellGallery` 同款半透明白底 */
  mainShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: PICKER_GLASS_PANEL_BG,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsChromeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(74, 55, 40, 0.12)',
  },
  settingsHeaderCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  settingsHeaderSpacer: { width: 44, flexShrink: 0 },
  settingsPanelScroll: { flex: 1, minHeight: 0 },
  settingsPanelScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  contentColumn: { alignSelf: 'center', width: '100%' },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: SDV.ink,
    letterSpacing: 1,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: SDV.subtext,
    marginTop: 6,
    textAlign: 'center',
  },
  section: {
    backgroundColor: GLASS_INNER_BG,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
  },
  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sectionTopRowOnly: { marginBottom: 0 },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: SDV.ink,
  },
  langBar: {
    flexDirection: 'row',
    flex: 1,
    maxWidth: 280,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 150, 100, 0.45)',
    backgroundColor: GLASS_INNER_BG,
    overflow: 'hidden',
  },
  langCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  langCellOn: {
    backgroundColor: SDV.wood,
  },
  langStar: { marginRight: 4 },
  langCellText: {
    fontSize: 14,
    fontWeight: '800',
    color: SDV.subtext,
  },
  langCellTextOn: {
    color: '#fff8ec',
  },
  personalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  personalRowStacked: {
    flexDirection: 'column',
  },
  personalColNick: {
    flex: 0.42,
    minWidth: 120,
  },
  creatorEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 2, borderColor: '#b9884c', backgroundColor: '#fae6bd', borderRadius: 6 },
  creatorPortrait: { width: 58, height: 76, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d8d8ae', borderRadius: 3 },
  creatorTitle: { fontSize: 16, fontWeight: '900', color: SDV.ink },
  creatorHint: { fontSize: 11, lineHeight: 17, color: SDV.subtext },
  personalColAvatar: {
    flex: 0.58,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: SDV.subtext,
    marginBottom: 8,
  },
  nickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(180, 150, 100, 0.4)',
    borderRadius: 10,
    backgroundColor: GLASS_INNER_BG,
    paddingHorizontal: 10,
    paddingVertical: 2,
    gap: 6,
    minHeight: 44,
  },
  nickInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SDV.ink,
    paddingVertical: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    gap: 5,
  },
  avatarCell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(140, 110, 70, 0.35)',
    backgroundColor: GLASS_INNER_BG,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  avatarCellOn: {
    borderColor: '#c9a040',
    borderWidth: 2.5,
    backgroundColor: 'rgba(255, 236, 180, 0.75)',
  },
  avatarClip: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  avatarImg: { width: 50, height: 50 },
  avatarCheck: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#c9a040',
    borderWidth: 1.5,
    borderColor: '#fff8ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelRow: { flexDirection: 'row', gap: 10 },
  modelCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 150, 100, 0.4)',
    borderRadius: 12,
    backgroundColor: GLASS_INNER_BG,
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 118,
    position: 'relative',
  },
  modelCardOn: {
    borderColor: '#c9a040',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 248, 230, 0.72)',
  },
  modelCardCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c9a040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: SDV.ink,
    marginTop: 8,
    textAlign: 'center',
  },
  modelCardDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: SDV.subtext,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 14,
  },
  modelHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
  },
  modelHint: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: SDV.subtext,
    lineHeight: 14,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  soundIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 150, 100, 0.35)',
    backgroundColor: GLASS_INNER_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundTextCol: { flex: 1 },
  soundTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: SDV.ink,
  },
  soundHint: {
    fontSize: 10,
    fontWeight: '600',
    color: SDV.subtext,
    marginTop: 3,
    lineHeight: 14,
  },
  soundDivider: {
    height: 1,
    backgroundColor: 'rgba(180, 150, 100, 0.35)',
    marginVertical: 4,
    marginLeft: 50,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    paddingBottom: 8,
  },
  cancelBtn: { minWidth: 100 },
  saveBtn: { minWidth: 168 },
});
