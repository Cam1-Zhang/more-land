import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { AppLanguage } from '../i18n/appStrings';
import { gameCopy } from '../i18n/appStrings';
import { roleIdentityTitles } from '../i18n/roleCardCopy';
import {
  groupPeerReviewsByTarget,
  type PeerReviewCell,
} from '../utils/postGamePeerReview';
import {
  gameWoodButtonFace,
  gameWoodButtonLabel,
  PICKER_GLASS_PANEL_BORDER,
} from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';

/** 与设置页 `SettingsSection` 内层一致 */
const GLASS_INNER_BG = 'rgba(255, 255, 255, 0.55)' as const;
/** 本局评价外框：比设置主壳更透 */
const REVIEWS_SHELL_BG = 'rgba(255, 252, 245, 0.42)' as const;

type Props = {
  visible: boolean;
  lang: AppLanguage;
  cells: readonly PeerReviewCell[];
  seatOrder: readonly string[];
  onClose: () => void;
};

function ReviewSection({
  title,
  rows,
  generatingLabel,
}: {
  title: string;
  rows: readonly PeerReviewCell[];
  generatingLabel: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.sectionEmpty}>{generatingLabel}</Text>
      ) : (
        rows.map((row) => (
          <View key={row.key} style={styles.reviewRow}>
            <Text style={styles.reviewerName}>{row.reviewerName}</Text>
            <Text style={styles.reviewText}>
              {row.status === 'ready' && row.text.trim()
                ? `「${row.text}」`
                : generatingLabel}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function GameEndPeerReviewsModal({
  visible,
  lang,
  cells,
  seatOrder,
  onClose,
}: Props) {
  const g = gameCopy[lang];
  const grouped = useMemo(
    () => groupPeerReviewsByTarget(cells, seatOrder),
    [cells, seatOrder]
  );
  const roleTitles = roleIdentityTitles[lang];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      supportedOrientations={['landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{g.peerReviewsTitle}</Text>
          <Text style={styles.subtitle}>{g.peerReviewsSubtitle}</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {grouped.map((group) => {
              const roleName = roleTitles[group.targetRole] ?? group.targetRole;
              return (
                <View key={group.targetId} style={styles.reviewsBody}>
                  <Text style={styles.playerName}>
                    {group.targetName}
                    <Text style={styles.playerRole}> · {roleName}</Text>
                  </Text>
                  <ReviewSection
                    title={g.peerReviewsTeammate}
                    rows={group.teammate}
                    generatingLabel={g.peerReviewsGenerating}
                  />
                  <ReviewSection
                    title={g.peerReviewsOpponent}
                    rows={group.opponent}
                    generatingLabel={g.peerReviewsGenerating}
                  />
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.9}>
            <Text style={styles.btnText}>{g.peerReviewsClose}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(62,39,35,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: REVIEWS_SHELL_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: SDV.ink,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: SDV.subtext,
    textAlign: 'center',
    lineHeight: 16,
  },
  scroll: {
    marginTop: 10,
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  reviewsBody: {
    gap: 12,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '900',
    color: SDV.ink,
    textAlign: 'center',
    marginBottom: 2,
  },
  playerRole: {
    fontSize: 12,
    fontWeight: '700',
    color: SDV.subtext,
  },
  section: {
    backgroundColor: GLASS_INNER_BG,
    borderWidth: 1.5,
    borderColor: PICKER_GLASS_PANEL_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: SDV.ink,
    marginBottom: 10,
  },
  sectionEmpty: {
    fontSize: 12,
    fontWeight: '600',
    color: SDV.subtext,
    fontStyle: 'italic',
  },
  reviewRow: {
    marginTop: 6,
  },
  reviewerName: {
    fontSize: 11,
    fontWeight: '800',
    color: SDV.ink,
  },
  reviewText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: SDV.ink,
    lineHeight: 18,
  },
  btn: {
    marginTop: 10,
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    ...gameWoodButtonFace('default'),
  },
  btnText: {
    ...gameWoodButtonLabel('default'),
    fontSize: 13,
  },
});
