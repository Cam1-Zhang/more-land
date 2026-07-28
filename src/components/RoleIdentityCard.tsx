import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import type { AppLanguage } from '../i18n/appStrings';
import {
  roleCardUi,
  roleIdentityBodies,
  roleIdentityBadgeName,
} from '../i18n/roleCardCopy';
import { ROLE_CARD_IMAGES } from '../constants/roleCardImages';
import { roleEmojiForRole } from '../utils/roleEmoji';
import { SDV, pixelChrome } from '../theme/stardewPixel';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';

type Props = {
  visible: boolean;
  role: string;
  lang: AppLanguage;
  privateIntel?: string;
  imageSource?: ImageSourcePropType;
  onConfirm: () => void;
};

const FRAME = '#2b190f';
const FRAME_OUTER = '#4a2b17';
const FRAME_HIGHLIGHT = '#7b4f28';
const STUD = '#d8ac35';
const STUD_EDGE = '#7a5316';
const PAPER = '#f5dfad';
const PAPER_LIGHT = '#fff3cf';
const PAPER_EDGE = '#9d7446';
const PORTRAIT_MAT = '#1b1714';
const GOLD = '#d2a044';
const LEAF_DARK = '#355326';
const LEAF_LIGHT = '#66843d';

function formatBodyLines(text: string, lang: AppLanguage): string[] {
  if (lang === 'zh') {
    const sentences = text
      .split(/(?<=[。！？])/u)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length <= 1) return sentences.length ? sentences : [text];
    return [
      sentences.slice(0, 1).join(''),
      sentences.slice(1).join(''),
    ].filter(Boolean);
  }
  const parts = text
    .split(/(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

function Stud({ style }: { style: object }) {
  return <View style={[styles.stud, style]} />;
}

export default function RoleIdentityCard({
  visible,
  role,
  lang,
  privateIntel,
  imageSource,
  onConfirm,
}: Props) {
  const ui = roleCardUi[lang];
  const badgeName =
    roleIdentityBadgeName[lang][role] ?? roleIdentityBadgeName[lang].Villager!;
  const body =
    roleIdentityBodies[lang][role] ?? roleIdentityBodies[lang].Villager!;
  const img =
    imageSource ??
    ROLE_CARD_IMAGES[role as keyof typeof ROLE_CARD_IMAGES] ??
    ROLE_CARD_IMAGES.Villager;
  const bodyLines = useMemo(() => formatBodyLines(body, lang), [body, lang]);
  const bodyCopy = bodyLines.join('\n\n');
  const intel = privateIntel?.trim();
  const { height: winH } = useWindowDimensions();
  const cardMaxH = Math.min(640, Math.round(winH * 0.9));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      supportedOrientations={['landscape-left', 'landscape-right']}
      onRequestClose={onConfirm}
    >
      <View style={styles.backdrop}>
        <View style={styles.outerWood}>
          <Stud style={styles.studTL} />
          <Stud style={styles.studTR} />
          <Stud style={styles.studBL} />
          <Stud style={styles.studBR} />
          <Stud style={styles.studTM} />
          <Stud style={styles.studBM} />
          <Stud style={styles.studML} />
          <Stud style={styles.studMR} />

          <View style={styles.parchment}>
            <ScrollView
              style={{ maxHeight: cardMaxH }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollInner}
              bounces={false}
            >
              <View style={styles.secretRow}>
                <Text style={styles.diamondSmall}>✦</Text>
                <Text style={styles.kicker}>{ui.secret}</Text>
                <Text style={styles.diamondSmall}>✦</Text>
              </View>

              <View style={styles.titleRow}>
                <Text style={styles.titleStar}>✦</Text>
                <Text style={styles.title}>{ui.title}</Text>
                <Text style={styles.titleStar}>✦</Text>
              </View>
              <View style={styles.titleRuleRow}>
                <View style={styles.titleRule} />
                <Text style={styles.titleRuleGem}>✧</Text>
                <View style={styles.titleRule} />
              </View>

              <View style={styles.portraitFrame}>
                <View style={styles.portraitStudTL} />
                <View style={styles.portraitStudTR} />
                <View style={styles.portraitStudBL} />
                <View style={styles.portraitStudBR} />
                <View style={styles.portraitMat}>
                  <Image source={img} style={[PIXEL_ART_SPRITE, styles.roleImage]} resizeMode="contain" />
                </View>
              </View>

              <View style={styles.badgePill}>
                <Text style={styles.badgeEmoji}>{roleEmojiForRole(role)}</Text>
                <Text style={styles.badgeName}>{badgeName}</Text>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLineShort} />
                <Text style={styles.dividerDiamond}>✦</Text>
                <View style={styles.dividerLineShort} />
              </View>

              <View style={styles.bodyBox}>
                <Text style={styles.bodyText}>{bodyCopy}</Text>
              </View>

              {intel ? (
                <View style={styles.intelBox}>
                  <Text style={styles.intelLabel}>{ui.privateIntel}</Text>
                  <Text style={styles.intelText}>{intel}</Text>
                </View>
              ) : null}

              <Text style={styles.footerOrnament}>· · · ❦ · · ·</Text>

              <TouchableOpacity style={styles.btn} onPress={onConfirm} activeOpacity={0.88}>
                <Text style={styles.btnSpark}>✦</Text>
                <Text style={styles.btnText}>{ui.confirm}</Text>
                <Text style={styles.btnSpark}>✦</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  outerWood: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 9,
    borderColor: FRAME,
    backgroundColor: FRAME_OUTER,
    padding: 9,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  stud: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: STUD,
    borderWidth: 1,
    borderColor: STUD_EDGE,
    zIndex: 2,
  },
  studTL: { top: 1, left: 1 },
  studTR: { top: 1, right: 1 },
  studBL: { bottom: 1, left: 1 },
  studBR: { bottom: 1, right: 1 },
  studTM: { top: 1, left: '50%', marginLeft: -4 },
  studBM: { bottom: 1, left: '50%', marginLeft: -4 },
  studML: { left: 1, top: '50%', marginTop: -4 },
  studMR: { right: 1, top: '50%', marginTop: -4 },
  parchment: {
    backgroundColor: PAPER,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: PAPER_EDGE,
    overflow: 'hidden',
    shadowColor: '#fff7dc',
    shadowOpacity: 0.55,
    shadowRadius: 0,
    shadowOffset: { width: -2, height: -2 },
  },
  scrollInner: {
    paddingHorizontal: 17,
    paddingTop: 15,
    paddingBottom: 17,
    alignItems: 'stretch',
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 7,
    marginBottom: 6,
  },
  diamondSmall: {
    fontSize: 9,
    color: GOLD,
    fontWeight: '900',
    marginTop: 1,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    color: SDV.inkMuted,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 12,
    marginBottom: 2,
  },
  titleStar: {
    fontSize: 16,
    color: GOLD,
    fontWeight: '900',
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: SDV.ink,
    textAlign: 'center',
    textShadowColor: '#fff3cf',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  titleRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '54%',
    gap: 6,
    marginBottom: 10,
  },
  titleRule: {
    flex: 1,
    height: 2,
    backgroundColor: GOLD,
    opacity: 0.45,
  },
  titleRuleGem: {
    fontSize: 9,
    fontWeight: '900',
    color: GOLD,
  },
  portraitFrame: {
    alignSelf: 'stretch',
    borderWidth: 3,
    borderColor: SDV.wood,
    borderRadius: 10,
    padding: 5,
    marginBottom: 10,
    position: 'relative',
    backgroundColor: FRAME_HIGHLIGHT,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
  },
  portraitStudTL: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 6,
    height: 6,
    backgroundColor: STUD,
    borderWidth: 1,
    borderColor: STUD_EDGE,
    zIndex: 1,
  },
  portraitStudTR: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 6,
    height: 6,
    backgroundColor: STUD,
    borderWidth: 1,
    borderColor: STUD_EDGE,
    zIndex: 1,
  },
  portraitStudBL: {
    position: 'absolute',
    left: 2,
    bottom: 2,
    width: 6,
    height: 6,
    backgroundColor: STUD,
    borderWidth: 1,
    borderColor: STUD_EDGE,
    zIndex: 1,
  },
  portraitStudBR: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 6,
    height: 6,
    backgroundColor: STUD,
    borderWidth: 1,
    borderColor: STUD_EDGE,
    zIndex: 1,
  },
  /** 4:3 视口，contain 放全图（素材宜 4:3） */
  portraitMat: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: PORTRAIT_MAT,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleImage: { width: '100%', height: '100%' },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 999,
    borderWidth: pixelChrome.borderWidth,
    borderColor: '#c79c5b',
    backgroundColor: PAPER_LIGHT,
    shadowColor: '#8a6238',
    shadowOpacity: 0.28,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
  },
  badgeEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  badgeName: {
    fontSize: 17,
    fontWeight: '900',
    color: SDV.ink,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 8,
    gap: 8,
  },
  dividerLineShort: {
    flex: 1,
    height: 2,
    backgroundColor: PAPER_EDGE,
    opacity: 0.45,
  },
  dividerDiamond: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '900',
  },
  bodyBox: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 248, 221, 0.55)',
    borderWidth: 2,
    borderColor: 'rgba(157, 116, 70, 0.32)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 9,
  },
  bodyText: {
    alignSelf: 'stretch',
    fontSize: 11,
    fontWeight: '700',
    color: SDV.ink,
    lineHeight: 18,
    textAlign: 'left',
  },
  intelBox: {
    alignSelf: 'stretch',
    backgroundColor: PAPER_LIGHT,
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 9,
  },
  intelLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: STUD_EDGE,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  intelText: {
    fontSize: 11,
    fontWeight: '800',
    color: SDV.ink,
    lineHeight: 18,
    textAlign: 'left',
  },
  footerOrnament: {
    marginBottom: 10,
    fontSize: 10,
    color: PAPER_EDGE,
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
  },
  btn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: LEAF_DARK,
    paddingVertical: 12,
    borderRadius: 7,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#27160d',
    borderTopColor: LEAF_LIGHT,
    borderLeftColor: LEAF_LIGHT,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
  },
  btnSpark: {
    color: STUD,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  btnText: {
    color: '#fff8df',
    fontSize: 13,
    fontWeight: '900',
    textShadowColor: '#1b1009',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
