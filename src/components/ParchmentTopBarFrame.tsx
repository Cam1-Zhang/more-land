import React, { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, ViewStyle } from 'react-native';
import { SDV } from '../theme/stardewPixel';

type Props = {
  children: ReactNode;
  /** 外层与屏幕左右的间距 */
  marginH?: number;
  marginTop?: number;
  marginBottom?: number;
  style?: StyleProp<ViewStyle>;
  /** 内层一行（放返回、标题等） */
  contentStyle?: StyleProp<ViewStyle>;
};

/** 全页统一顶栏：厚木板 + 金铆钉（不替换内部控件） */
export default function ParchmentTopBarFrame({
  children,
  marginH = 10,
  marginTop = 4,
  marginBottom = 10,
  style,
  contentStyle,
}: Props) {
  return (
    <View style={[{ marginHorizontal: marginH, marginTop, marginBottom }, style]}>
      <View style={styles.plank}>
        <View style={[styles.rivet, styles.rTL]} />
        <View style={[styles.rivet, styles.rTR]} />
        <View style={[styles.rivet, styles.rBL]} />
        <View style={[styles.rivet, styles.rBR]} />
        <View style={[styles.rivet, styles.rTM]} />
        <View style={[styles.rivet, styles.rBM]} />
        <View style={[styles.contentRow, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const RIV = '#e8c44a';
const RIV_B = '#7a5a18';

const styles = StyleSheet.create({
  plank: {
    borderRadius: 12,
    backgroundColor: SDV.woodMid,
    borderWidth: 3,
    borderColor: SDV.wood,
    borderTopColor: '#9a7348',
    borderBottomColor: '#3d2616',
    borderLeftColor: SDV.wood,
    borderRightColor: SDV.wood,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
  },
  rivet: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RIV,
    borderWidth: 1,
    borderColor: RIV_B,
    zIndex: 2,
  },
  rTL: { top: 4, left: 4 },
  rTR: { top: 4, right: 4 },
  rBL: { bottom: 4, left: 4 },
  rBR: { bottom: 4, right: 4 },
  rTM: { top: 4, left: '50%', marginLeft: -3.5 },
  rBM: { bottom: 4, left: '50%', marginLeft: -3.5 },
  contentRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 1,
  },
});
