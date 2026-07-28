import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { AppLanguage } from '../i18n/appStrings';
import { deathRulesTeachingCopy } from '../i18n/deathRulesTeaching';
import { gameWoodButtonFace, gameWoodButtonLabel } from '../theme/gameButton';
import { SDV } from '../theme/stardewPixel';

type Props = {
  visible: boolean;
  lang: AppLanguage;
  onConfirm: () => void;
};

export default function DeathRulesTeachingModal({ visible, lang, onConfirm }: Props) {
  const c = deathRulesTeachingCopy[lang];

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
        <View style={styles.card}>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.subtitle}>{c.subtitle}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {c.sections.map((sec, si) => (
              <View key={si} style={styles.section}>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
                {sec.bullets.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletMark}>{`${i + 1}.`}</Text>
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.btn} onPress={onConfirm} activeOpacity={0.9}>
            <Text style={styles.btnText}>{c.confirm}</Text>
          </TouchableOpacity>
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
    maxWidth: 432,
    maxHeight: '88%',
    backgroundColor: SDV.panel,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: SDV.wood,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: SDV.ink,
    textAlign: 'center',
    marginBottom: 7,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: SDV.subtext,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  scroll: { maxHeight: 450 },
  scrollContent: { paddingBottom: 10 },
  section: { marginBottom: 17 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: SDV.ink,
    marginBottom: 11,
    letterSpacing: 0.3,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletMark: {
    width: 24,
    fontSize: 13,
    fontWeight: '900',
    color: SDV.ink,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: SDV.ink,
    lineHeight: 22,
  },
  btn: {
    marginTop: 10,
    paddingVertical: 17,
    alignItems: 'center',
    ...gameWoodButtonFace('default'),
  },
  btnText: { ...gameWoodButtonLabel('default'), fontSize: 14 },
});
