import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { AppLanguage } from '../i18n/appStrings';
import { ROLE_CARD_IMAGES } from '../constants/roleCardImages';
import { roleIdentityTitles } from '../i18n/roleCardCopy';
import { gameCopy } from '../i18n/appStrings';
import {
  gameEpilogueCardUi,
  epilogueQuoteForRole,
  playerSideWon,
  normalizeEpilogueRole,
} from '../i18n/gameEpilogueCopy';
import { gameWoodButtonFace, gameWoodButtonLabel } from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';

type Props = {
  visible: boolean;
  lang: AppLanguage;
  winner: 'good' | 'wolf';
  role: string;
  onDismiss: () => void;
  onViewReviews?: () => void;
};

export default function GameEndEpilogueModal({
  visible,
  lang,
  winner,
  role,
  onDismiss,
  onViewReviews,
}: Props) {
  const ui = gameEpilogueCardUi[lang];
  const g = gameCopy[lang];
  const roleKey = normalizeEpilogueRole(role);
  const title = roleIdentityTitles[lang][roleKey] ?? roleIdentityTitles[lang].Villager;
  const didWin = playerSideWon(winner, roleKey);
  const quote = epilogueQuoteForRole(lang, roleKey, didWin);
  const img = ROLE_CARD_IMAGES[roleKey] ?? ROLE_CARD_IMAGES.Villager;
  const banner = winner === 'good' ? ui.bannerGood : ui.bannerWolf;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      supportedOrientations={['landscape-left', 'landscape-right']}
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{ui.title}</Text>
          <Text style={styles.banner}>{banner}</Text>

          <View style={styles.imageWrap}>
            <Image source={img} style={[PIXEL_ART_SPRITE, styles.roleImage]} resizeMode="contain" />
          </View>

          <Text style={styles.roleName}>{title}</Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.badge, didWin ? styles.badgeWin : styles.badgeLose]}>
              {didWin ? ui.outcomeWin : ui.outcomeLose}
            </Text>
          </View>
          <Text style={styles.quote}>{quote}</Text>

          {onViewReviews ? (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={onViewReviews}
                activeOpacity={0.9}
              >
                <Text style={styles.btnTextSecondary}>{g.viewPeerReviews}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.9}>
                <Text style={styles.btnText}>{ui.continue}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.9}>
              <Text style={styles.btnText}>{ui.continue}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(62,39,35,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: SDV.panel,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: SDV.wood,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: SDV.subtext,
    letterSpacing: 1,
  },
  banner: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '900',
    color: SDV.ink,
    textAlign: 'center',
  },
  imageWrap: {
    marginTop: 10,
    alignSelf: 'stretch',
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1510',
    borderRadius: 6,
    overflow: 'hidden',
  },
  roleImage: {
    width: '100%',
    height: '100%',
  },
  roleName: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '900',
    color: SDV.ink,
    textAlign: 'center',
  },
  badgeRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: SDV.wood,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '900',
    color: SDV.ink,
  },
  badgeWin: {
    backgroundColor: '#d4e8c8',
    borderColor: SDV.leaf,
  },
  badgeLose: {
    backgroundColor: '#f5d0c8',
    borderColor: '#b71c1c',
  },
  quote: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: SDV.ink,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  btnRow: {
    marginTop: 18,
    alignSelf: 'stretch',
    gap: 10,
  },
  btn: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    alignItems: 'center',
    ...gameWoodButtonFace('default'),
  },
  btnSecondary: {
    ...gameWoodButtonFace('muted'),
  },
  btnTextSecondary: {
    ...gameWoodButtonLabel('muted'),
    fontSize: 13,
  },
  btnText: {
    ...gameWoodButtonLabel('default'),
    fontSize: 13,
  },
});
