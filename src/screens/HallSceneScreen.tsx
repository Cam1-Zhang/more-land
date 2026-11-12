import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Sun } from 'lucide-react-native';
import HallRoomScene from '../components/HallRoomScene';
import { HALL, INITIAL_HALL_OCCUPANTS, fitHallOccupants, moveHallOccupant } from '../constants/hallScene';
import type { ExplorerId } from '../components/ExplorationSprite';
import { GAME_ROOM_BACKGROUND_DAY } from '../constants/gameRoomSceneImages';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';

export default function HallSceneScreen() {
  const navigation = useNavigation<NavigationProp<{ Exploration: undefined }>>();
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState({ width: 1024, height: 576 });
  const [occupants, setOccupants] = useState(INITIAL_HALL_OCCUPANTS);
  const [selected, setSelected] = useState<string>('toby');
  const [seatCount, setSeatCount] = useState<6 | 12>(12);
  const [reference, setReference] = useState(false);
  const [furnished, setFurnished] = useState(true);
  const [entryKey, setEntryKey] = useState(0);
  const width = Math.min(viewport.width, viewport.height * HALL.width / HALL.height);
  const setCount = (count: 6 | 12) => {
    setSeatCount(count); setOccupants(current => fitHallOccupants(current, count));
  };
  const reset = () => {
    setOccupants(fitHallOccupants(INITIAL_HALL_OCCUPANTS, seatCount));
    setReference(false); setFurnished(true); setEntryKey(key => key + 1);
  };
  return <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="返回探索" onPress={() => navigation.navigate('Exploration')} style={styles.iconButton}><ArrowLeft size={20} color="#e8c592" /></Pressable>
      <View style={styles.heading}><Text style={styles.kicker}>THE WOLF LODGE</Text><Text style={styles.title}>圆桌大厅</Text></View>
      <View style={styles.day}><Sun size={18} color="#dfac58" /><Text style={styles.dayText}>午后 · 木屋</Text></View>
    </View>
    <View style={styles.sceneHost} onLayout={event => setViewport(event.nativeEvent.layout)}>
      {reference ? <Image source={GAME_ROOM_BACKGROUND_DAY} resizeMode="contain" style={[PIXEL_ART_SPRITE, { width, height: width * HALL.height / HALL.width }]} accessibilityLabel="原始大厅背景图" />
        : <HallRoomScene width={width} occupants={occupants} selected={selected} seatCount={seatCount} furnished={furnished} entryKey={entryKey}
          onSeatPress={seatId => setOccupants(current => moveHallOccupant(current, selected, seatId))} />}
      <View pointerEvents="none" style={styles.sceneBadge}><Text style={styles.badgeText}>{reference ? '原始背景' : furnished ? '圆桌已备好 · 2 位伙伴入座' : '木屋空房'}</Text></View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbarScroll} contentContainerStyle={styles.toolbar}>
      <View style={styles.group}><Text style={styles.groupTitle}>入座的伙伴</Text><View style={styles.row}>
        {occupants.map(actor => <Pressable key={actor.id} accessibilityRole="button" accessibilityLabel={`选择 ${actor.name} 换座`} accessibilityState={{ selected: actor.id === selected }}
          onPress={() => setSelected(actor.id)} style={[styles.button, actor.id === selected && styles.activeButton]}>
          <Text style={styles.buttonText}>{actor.name}</Text><Text style={styles.smallText}>{actor.seatId + 1} 号座</Text>
        </Pressable>)}
      </View></View>
      <View style={styles.group}><Text style={styles.groupTitle}>圆桌座位</Text><View style={styles.row}>{([6, 12] as const).map(count =>
        <Pressable key={count} accessibilityRole="button" accessibilityLabel={`${count}人圆桌`} accessibilityState={{ selected: seatCount === count }} onPress={() => setCount(count)} style={[styles.button, seatCount === count && styles.activeButton]}><Text style={styles.buttonText}>{count} 人</Text></Pressable>
      )}</View></View>
      <View style={styles.group}><Text style={styles.groupTitle}>场景查看</Text><View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="对照原图" accessibilityState={{ selected: reference }} onPress={() => setReference(value => !value)} style={[styles.button, reference && styles.activeButton]}><Text style={styles.buttonText}>{reference ? '返回场景' : '对照原图'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="查看空房" accessibilityState={{ selected: !furnished }} onPress={() => { setReference(false); setFurnished(value => !value); }} style={styles.button}><Text style={styles.buttonText}>{furnished ? '查看空房' : '摆好桌椅'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="重新入座" onPress={reset} style={styles.button}><RotateCcw size={17} color="#e8c592" /><Text style={styles.buttonText}>重新入座</Text></Pressable>
      </View></View>
    </ScrollView>
    <Text style={styles.hint}>选择伙伴，再点椅子换座。已有伙伴的座位会自动互换。</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e160f' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#513b26' },
  iconButton: { width: 40, height: 40, borderWidth: 1, borderColor: '#745432', backgroundColor: '#302217', alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, gap: 4 }, kicker: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, fontSize: 10, letterSpacing: 2, color: '#b5905f' },
  title: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, fontSize: 23, color: '#f2d4a2' },
  day: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dayText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#c9a97a', fontSize: 12 },
  sceneHost: { flex: 1, minHeight: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#100d09', overflow: 'hidden' },
  sceneBadge: { position: 'absolute', top: 10, right: 12, backgroundColor: '#21160dc9', paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#91633377' },
  badgeText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#d4b17d', fontSize: 11 },
  toolbarScroll: { flexGrow: 0, flexShrink: 0 }, toolbar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 24, alignItems: 'flex-start' },
  group: { gap: 7 }, groupTitle: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, fontSize: 11, color: '#ad8b60', letterSpacing: 1 }, row: { flexDirection: 'row', gap: 7 },
  button: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#32251a', borderWidth: 1, borderColor: '#65492f' },
  activeButton: { backgroundColor: '#574025', borderColor: '#d1aa68' },
  buttonText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#f0d1a0', fontSize: 13 }, smallText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#bb9c6e', fontSize: 10 },
  hint: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#a78a62', fontSize: 11, paddingHorizontal: 20, paddingBottom: 10, paddingTop: 3 },
});
