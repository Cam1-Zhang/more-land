import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import type { AppLanguage } from '../i18n/appStrings';
import { tutorialUi } from '../i18n/tutorialSteps';
import { roleIdentityTitles } from '../i18n/roleCardCopy';
import { ROLE_CARD_IMAGES, type RoleCardImageKey } from '../constants/roleCardImages';
import {
  PICKER_GLASS_PANEL_BG,
  PICKER_GLASS_PANEL_BORDER,
} from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import HubDayNightBackground from './HubDayNightBackground';
import { readHomeHubScene, type HomeHubScene } from '../utils/homeBgMode';
import { GameWoodButton } from './GameWoodButton';

const GLASS_INNER_BG = 'rgba(255, 255, 255, 0.55)' as const;

import type { GameBoard } from '../types/game';

type Board = GameBoard;

const STANDARD_PICK_ROLES: RoleCardImageKey[] = [
  'Werewolf',
  'Seer',
  'Witch',
  'Hunter',
  'Idiot',
  'Villager',
];

const BEAUTY_PICK_ROLES: RoleCardImageKey[] = [
  'Werewolf',
  'WolfBeauty',
  'Seer',
  'Witch',
  'Guard',
  'Knight',
  'Villager',
];

const SEER_WITCH_6_PICK_ROLES: RoleCardImageKey[] = [
  'Werewolf',
  'Seer',
  'Witch',
  'Villager',
];

type Props = {
  visible: boolean;
  board: Board;
  lang: AppLanguage;
  onConfirm: (role: RoleCardImageKey) => void;
};

export default function TutorialRolePickerModal({ visible, board, lang, onConfirm }: Props) {
  const ui = tutorialUi[lang];
  const titles = roleIdentityTitles[lang];
  const roles = useMemo(
    () =>
      board === 'WolfBeauty'
        ? BEAUTY_PICK_ROLES
        : board === 'SeerWitch6'
          ? SEER_WITCH_6_PICK_ROLES
          : STANDARD_PICK_ROLES,
    [board],
  );
  const [picked, setPicked] = useState<RoleCardImageKey>('Villager');
  const [hubScene, setHubScene] = useState<HomeHubScene>({ mode: 'day', lights: 'off' });

  useEffect(() => {
    if (!visible) return;
    setPicked((prev) => (roles.includes(prev) ? prev : roles[0]!));
    void readHomeHubScene().then(setHubScene);
  }, [visible, board, roles]);

  const previewTitle = titles[picked] ?? titles.Villager!;
  const previewBody = ui.pickRolePreview;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      supportedOrientations={['landscape-left', 'landscape-right']}
    >
      <HubDayNightBackground scene={hubScene} style={styles.root}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.kicker}>{ui.pickRoleKicker}</Text>
            <Text style={styles.title}>{ui.pickRoleTitle}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tileRow}
              keyboardShouldPersistTaps="handled"
            >
              {roles.map((r) => {
                const sel = r === picked;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.tile, sel && styles.tileSelected]}
                    onPress={() => setPicked(r)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={ROLE_CARD_IMAGES[r]}
                      style={[PIXEL_ART_SPRITE, styles.tileImg]}
                      resizeMode="contain"
                    />
                    <Text style={styles.tileCap} numberOfLines={2}>
                      {titles[r] ?? r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.previewWrap}>
              <Image
                source={ROLE_CARD_IMAGES[picked]}
                style={[PIXEL_ART_SPRITE, styles.previewImg]}
                resizeMode="contain"
              />
              <Text style={styles.previewTitle}>{previewTitle}</Text>
              <Text style={styles.previewHint}>{previewBody}</Text>
            </View>
            <GameWoodButton
              variant="text"
              wide
              label={ui.pickRoleConfirm}
              onPress={() => onConfirm(picked)}
              style={styles.confirmBtn}
            />
          </View>
        </View>
      </HubDayNightBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(62, 39, 35, 0.18)',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: PICKER_GLASS_PANEL_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    paddingVertical: 20,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: SDV.subtext,
    marginBottom: 5,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: SDV.ink,
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  tile: {
    width: 100,
    marginRight: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    backgroundColor: GLASS_INNER_BG,
    padding: 7,
    alignItems: 'center',
  },
  tileSelected: {
    borderWidth: 2.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    backgroundColor: 'rgba(255, 236, 180, 0.72)',
  },
  tileImg: { width: 78, height: 78 },
  tileCap: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '800',
    color: SDV.ink,
    textAlign: 'center',
    lineHeight: 13,
  },
  previewWrap: {
    marginTop: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(74, 55, 40, 0.12)',
    paddingTop: 14,
  },
  previewImg: { width: 104, height: 104 },
  previewTitle: {
    marginTop: 9,
    fontSize: 16,
    fontWeight: '900',
    color: SDV.ink,
    textAlign: 'center',
  },
  previewHint: {
    marginTop: 9,
    fontSize: 12,
    fontWeight: '600',
    color: SDV.subtext,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  confirmBtn: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
});
