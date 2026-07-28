import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HubBgmIconButton from './HubBgmIconButton';
import { homeChromeRight, homeChromeTop } from '../utils/homeTopChromeLayout';

type Props = {
  enabled: boolean;
  onPress: () => void;
  reserveRightPx?: number;
};

/**
 * 主页 / 教程 / 组队 等：右上角浮动 BGM（选人页在顶栏内嵌，不显示此组件）
 */
export default function HubMusicFloatingToggle({ enabled, onPress, reserveRightPx = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const top = homeChromeTop(insets);
  const right = homeChromeRight(insets) + reserveRightPx;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 2000 }]}>
      <View style={{ position: 'absolute', top, right }}>
        <HubBgmIconButton enabled={enabled} onPress={onPress} />
      </View>
    </View>
  );
}
