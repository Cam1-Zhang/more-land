import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { useIsFocused, useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search, X } from 'lucide-react-native';
import ExplorationSprite, { type Facing } from '../components/ExplorationSprite';
import ExplorationMeadow from '../components/ExplorationMeadow';
import { CHARACTERS } from '../data/mockData';
import { EXPLORATION_SPRITES } from '../constants/explorationSprites';
import { EXPLORATION_WORLD as WORLD, WALK_FRAME, WALK_VECTORS, clampWalkPoint, createExplorers, explorerHome, explorationCamera, stepExplorer, type WalkPoint, type WalkingActor } from '../constants/explorationWorld';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';

// Only validated animations enter the live scene; never substitute another person's art.
const ROSTER = CHARACTERS.filter(character => EXPLORATION_SPRITES[character.id]);
const IDS = ROSTER.map(character => character.id);
const KEYS: Record<string, Facing> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
const LEVELS = { Novice: '新手', Easy: '简单', Medium: '中等', Hard: '困难' } as const;
const DIRECTIONS = [{ direction: 'up', Icon: ChevronUp }, { direction: 'left', Icon: ChevronLeft }, { direction: 'down', Icon: ChevronDown }, { direction: 'right', Icon: ChevronRight }] as const;
const ActorView = memo(function ActorView({ id, name, actor, selected, scale, choose }: { id: string; name: string; actor: WalkingActor; selected: boolean; scale: number; choose: (id: string) => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`选择 ${name}`} accessibilityState={{ selected }} testID={`explorer-${id}`} onPress={() => choose(id)} style={[styles.actor, { left: Math.round(actor.x - WALK_FRAME.width / 2) * scale, top: Math.round(actor.y - WALK_FRAME.footY) * scale, width: WALK_FRAME.width * scale, height: WALK_FRAME.height * scale }]}>
    <View pointerEvents="none" style={[styles.shadow, { left: 10 * scale, top: 41 * scale, width: 20 * scale, height: 5 * scale }, selected && styles.selectedShadow]} />
    {selected && <View pointerEvents="none" style={[styles.marker, { left: WALK_FRAME.width / 2 * scale - 4, top: -4 }]} />}
    <ExplorationSprite character={id} facing={actor.facing} frame={actor.frame} scale={scale} />
    <View pointerEvents="none" style={[styles.nameplate, selected && styles.activeNameplate]}><Text style={styles.name}>{name}</Text></View>
  </Pressable>;
});

export default function ExplorationScreen({ onReturnToValley }: { onReturnToValley?: () => void }) {
  const navigation = useNavigation<NavigationProp<{ Home: undefined; HallScene: undefined }>>();
  const insets = useSafeAreaInsets(), focused = useIsFocused();
  const [size, setSize] = useState({ width: 960, height: 540 });
  const compact = size.width < 600, scale = 2;
  const [selected, setSelected] = useState('1');
  const [actors, setActors] = useState(() => createExplorers(IDS));
  const actorsRef = useRef(actors), held = useRef(new Map<string, Facing>()), target = useRef<WalkPoint | null>(null);
  const [destination, setDestination] = useState<WalkPoint | null>(null);
  const [wandering, setWandering] = useState(true), [picker, setPicker] = useState(false), [search, setSearch] = useState('');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const wander = useRef<Record<string, { goal: WalkPoint | null; next: number; round: number }>>({});
  const stop = useCallback(() => {
    held.current.clear(); target.current = null; setDestination(null);
    const next = Object.fromEntries(Object.entries(actorsRef.current).map(([id, actor]) => [id, actor.frame ? { ...actor, frame: 0 } : actor]));
    actorsRef.current = next; setActors(next);
  }, []);
  const choose = useCallback((id: string) => { stop(); setSelected(id); setPicker(false); }, [stop]);
  const currentCharacter = ROSTER.find(character => character.id === selected)!;
  const camera = explorationCamera(actors[selected], size, scale);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { setForeground(state === 'active'); if (state !== 'active') stop(); });
    return () => subscription.remove();
  }, [stop]);
  useEffect(() => {
    if (!focused || !foreground || picker) { stop(); return; }
    let previous = Date.now(), time = 0;
    const timer = setInterval(() => {
      const now = Date.now(), elapsed = Math.min(now - previous, 80); previous = now; time += elapsed;
      const direction = [...held.current.values()].pop(), before = actorsRef.current, next = { ...before };
      let changed = false;
      IDS.forEach((id, index) => {
        const actor = before[id]; let goal: WalkPoint | null = null, speed = 58;
        if (id === selected) {
          goal = direction ? { x: actor.x + WALK_VECTORS[direction].x * 100, y: actor.y + WALK_VECTORS[direction].y * 100 } : target.current;
        } else if (wandering) {
          const task = wander.current[id] ?? (wander.current[id] = { goal: null, next: now + index % 7 * 320, round: 0 });
          if (!task.goal && now >= task.next) {
            task.round++; const home = explorerHome(index), angle = (index * 137 + task.round * 97) * Math.PI / 180;
            task.goal = clampWalkPoint({ x: home.x + Math.cos(angle) * 55, y: home.y + Math.sin(angle) * 45 });
          }
          goal = task.goal; speed = 18 + index % 5 * 3;
        }
        const moved = goal ? stepExplorer(actor, goal, speed * elapsed / 1000, time + index * 53) : actor.frame ? { ...actor, frame: 0 } : actor;
        if (goal && moved.frame === 0 && Math.hypot(moved.x - clampWalkPoint(goal).x, moved.y - clampWalkPoint(goal).y) < .1) {
          if (id === selected && !direction) { target.current = null; setDestination(null); }
          else if (id !== selected) { wander.current[id].goal = null; wander.current[id].next = now + 1500 + index % 5 * 700; }
        }
        if (moved.x !== actor.x || moved.y !== actor.y || moved.frame !== actor.frame || moved.facing !== actor.facing) { next[id] = moved; changed = true; }
      });
      if (changed) { actorsRef.current = next; setActors(next); }
    }, 40);
    return () => clearInterval(timer);
  }, [focused, foreground, picker, selected, wandering, stop]);
  useEffect(() => {
    if (!focused || picker || Platform.OS !== 'web') return;
    const down = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement)?.matches?.('input, textarea, [contenteditable="true"]')) return;
      const direction = KEYS[event.key] ?? KEYS[event.key.toLowerCase()]; if (!direction) return;
      event.preventDefault(); held.current.set(event.code, direction); target.current = null; setDestination(null);
    };
    const up = (event: KeyboardEvent) => { held.current.delete(event.code); if (!held.current.size && !target.current) stop(); };
    const visibility = () => { setForeground(!document.hidden); if (document.hidden) stop(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', stop); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', visibility); };
  }, [focused, picker, stop]);
  const moveTo = (event: GestureResponderEvent) => {
    let { locationX, locationY } = event.nativeEvent;
    if (Platform.OS === 'web') { const box = (event.currentTarget as unknown as HTMLElement).getBoundingClientRect(), mouse = event.nativeEvent as unknown as MouseEvent; locationX = mouse.clientX - box.left; locationY = mouse.clientY - box.top; }
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
    const goal = clampWalkPoint({ x: (locationX + camera.x) / scale, y: (locationY + camera.y) / scale });
    held.current.clear(); target.current = goal; setDestination(goal);
  };
  const visible = ROSTER.filter(character => { const a = actors[character.id]; return a.x * scale > camera.x - 70 && a.x * scale < camera.x + size.width + 70 && a.y * scale > camera.y - 25 && a.y * scale < camera.y + size.height + 110; }).sort((a, b) => actors[a.id].y - actors[b.id].y);
  const matches = ROSTER.filter(character => `${character.name} ${LEVELS[character.difficulty]}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Pressable accessibilityRole="button" accessibilityLabel={onReturnToValley ? '返回雾铃谷' : '返回首页'} onPress={onReturnToValley ?? (() => navigation.navigate('Home'))} style={styles.back}><ArrowLeft size={20} color="#eee4bd" /></Pressable>
      <View style={styles.heading}><Text style={styles.eyebrow}>青 苔 原 野 · MEADOW</Text><Text style={styles.title}>探索</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="进入木屋" onPress={() => navigation.navigate('HallScene')} style={styles.lodgeButton}><Text style={styles.weatherText}>进入木屋 →</Text></Pressable>
    </View>
    <View style={styles.fieldFrame} onLayout={event => setSize(event.nativeEvent.layout)}>
      <View pointerEvents="none" style={{ position: 'absolute', left: -camera.x, top: -camera.y, width: WORLD.width * scale, height: WORLD.height * scale }}><ExplorationMeadow width={WORLD.width} height={WORLD.height} /></View>
      <Pressable style={StyleSheet.absoluteFill} onPress={moveTo} accessibilityLabel="草坪，点击地面移动所选角色" testID="exploration-ground" />
      <View pointerEvents="box-none" testID="exploration-world" style={{ position: 'absolute', left: -camera.x, top: -camera.y, width: WORLD.width * scale, height: WORLD.height * scale }}>
        {destination && <View pointerEvents="none" style={[styles.destination, { left: destination.x * scale - 9, top: destination.y * scale - 5 }]} />}
        {visible.map(character => <ActorView key={character.id} id={character.id} name={character.name} actor={actors[character.id]} selected={selected === character.id} scale={scale} choose={choose} />)}
      </View>
      <View pointerEvents="none" style={styles.placeTag}><Text style={styles.placeText}>初夏草坪 · {ROSTER.length} 位伙伴</Text></View>
      {!compact && <View pointerEvents="none" style={styles.minimap}>{ROSTER.map(character => <View key={character.id} style={{ position: 'absolute', left: actors[character.id].x / WORLD.width * 120 - 2, top: actors[character.id].y / WORLD.height * 80 - 2, width: selected === character.id ? 5 : 3, height: selected === character.id ? 5 : 3, backgroundColor: selected === character.id ? '#ffe3a0' : '#91b957' }} />)}</View>}
    </View>
    <View style={[styles.footer, compact && styles.footerCompact]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`选择伙伴，当前 ${currentCharacter.name}，共 ${ROSTER.length} 人`} onPress={() => { stop(); setSearch(''); setPicker(true); }} style={[styles.card, styles.activeCard]}>
        <ExplorationSprite character={selected} scale={1} /><View><Text style={styles.cardName}>{currentCharacter.name}</Text><Text style={styles.cardStatus}>切换伙伴 · {ROSTER.length} 人</Text></View><ChevronDown size={16} color="#f4e8c7" />
      </Pressable>
      {!compact && <View style={styles.instructions}><Text style={styles.instructionTitle}>跟着伙伴，逛一逛草坪。</Text><Text style={styles.instructionText}>点击草地 · WASD / 方向键 · 镜头跟随</Text><Pressable accessibilityRole="switch" accessibilityState={{ checked: wandering }} accessibilityLabel="伙伴自由散步" onPress={() => setWandering(value => !value)}><Text style={styles.walkToggle}>伙伴自由散步：{wandering ? '开' : '关'}</Text></Pressable></View>}
      <View style={styles.dpad}>{DIRECTIONS.map(({ direction, Icon }) => <Pressable key={direction} accessibilityRole="button" accessibilityLabel={`向${({ up: '上', down: '下', left: '左', right: '右' })[direction]}移动`} onPressIn={() => { held.current.set('touch', direction); target.current = null; setDestination(null); }} onPressOut={stop} style={({ pressed }) => [styles.direction, styles[direction], pressed && styles.directionPressed]}><Icon size={21} color="#f4e8c7" /></Pressable>)}</View>
    </View>
    {compact && <Text style={styles.mobileHint}>点草地移动 · 点名字换伙伴 · 长按方向按钮漫步</Text>}
    <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
      <View style={styles.scrim}><View accessibilityViewIsModal style={styles.picker}>
        <View style={styles.pickerHeader}><View style={{ flex: 1 }}><Text style={styles.pickerTitle}>选择同行的伙伴</Text><Text style={styles.cardStatus}>共 {ROSTER.length} 位 · 点击角色，镜头会跟随他</Text></View><Pressable accessibilityRole="button" accessibilityLabel="关闭伙伴选择" onPress={() => setPicker(false)} style={styles.back}><X size={20} color="#eee4bd" /></Pressable></View>
        <View style={styles.search}><Search size={18} color="#b7be94" /><TextInput autoFocus accessibilityLabel="搜索伙伴" placeholder="搜索名字或难度" placeholderTextColor="#aab895" value={search} onChangeText={setSearch} style={styles.searchInput} /></View>
        <FlatList data={matches} keyExtractor={item => item.id} numColumns={2} columnWrapperStyle={{ gap: 8 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} keyboardShouldPersistTaps="handled" initialNumToRender={12} ListEmptyComponent={<Text style={styles.empty}>没有找到这个伙伴</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`控制 ${item.name}`} accessibilityState={{ selected: selected === item.id }} onPress={() => choose(item.id)} style={[styles.pickerCard, selected === item.id && styles.activeCard]}><ExplorationSprite character={item.id} scale={1} /><View style={{ flex: 1 }}><Text style={styles.cardName}>{item.name}</Text><Text style={styles.cardStatus}>{LEVELS[item.difficulty]} · {selected === item.id ? '正在控制' : '一起散步'}</Text></View></Pressable>} />
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  minimap: { position: 'absolute', bottom: 12, right: 14, width: 124, height: 84, borderWidth: 2, borderColor: '#c4bb83', backgroundColor: '#293f32dd' },
  walkToggle: { color: '#e6ce88', fontSize: 12, marginTop: 5 },
  scrim: { flex: 1, backgroundColor: '#14231ddb', alignItems: 'center', justifyContent: 'center', padding: 18 },
  picker: { width: '100%', maxWidth: 620, height: '85%', maxHeight: 700, padding: 16, backgroundColor: '#293f32', borderWidth: 3, borderColor: '#c6b47a', gap: 12 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickerTitle: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, fontSize: 22, color: '#f7edce' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1f3328', paddingHorizontal: 12, borderWidth: 1, borderColor: '#657056' },
  searchInput: { flex: 1, height: 44, color: '#f7edce', fontSize: 15 },
  pickerCard: { flex: 1, maxWidth: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderWidth: 2, borderColor: '#536044', backgroundColor: '#354b39' },
  empty: { color: '#b7be94', textAlign: 'center', padding: 30 },
  root: { flex: 1, backgroundColor: '#293f32' },
  header: { paddingHorizontal: 30, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', gap: 18 },
  headerCompact: { paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  back: { width: 42, height: 42, borderWidth: 2, borderColor: '#657056', alignItems: 'center', justifyContent: 'center', backgroundColor: '#354b39' },
  heading: { flex: 1, gap: 4 }, eyebrow: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#b7be94', fontSize: 11, letterSpacing: 1 },
  title: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#f7edce', fontSize: 27 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 10 }, weatherText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#eee4bd', fontSize: 14 },
  lodgeButton: { paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#a89461', backgroundColor: '#4b4b32' },
  fieldFrame: { flex: 1, overflow: 'hidden', marginHorizontal: 12, borderWidth: 3, borderColor: '#1e3028', backgroundColor: '#91b957' },
  actor: { position: 'absolute', alignItems: 'center' },
  shadow: { position: 'absolute', backgroundColor: '#476b3c66', borderRadius: 40 },
  selectedShadow: { borderWidth: 1, borderColor: '#f5e6a0', backgroundColor: '#53764055' },
  marker: { position: 'absolute', width: 8, height: 8, backgroundColor: '#ffe5a1', transform: [{ rotate: '45deg' }] },
  nameplate: { position: 'absolute', top: '100%', paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#355239b8', borderWidth: 1, borderColor: '#5c7748' },
  activeNameplate: { backgroundColor: '#38432e', borderColor: '#e6ce88' },
  name: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, fontSize: 12, color: '#fff0c9' },
  destination: { position: 'absolute', width: 18, height: 10, borderWidth: 2, borderColor: '#fff0b5', borderRadius: 9 },
  placeTag: { position: 'absolute', bottom: 12, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#395539bc', paddingHorizontal: 10, paddingVertical: 6 },
  placeText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, fontSize: 12, color: '#ece9c5' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 30, paddingHorizontal: 30, paddingVertical: 18 },
  footerCompact: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, gap: 10, justifyContent: 'space-between' },
  companions: { gap: 8 }, sectionLabel: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#b7be94', fontSize: 12, letterSpacing: 2 },
  cards: { flexDirection: 'row', gap: 8 }, card: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 2, borderColor: '#536044', backgroundColor: '#354b39' },
  cardCompact: { paddingHorizontal: 5, gap: 3 }, activeCard: { borderColor: '#d8c182', backgroundColor: '#485b3c' },
  cardName: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#faedc9', fontSize: 16 }, cardStatus: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#c3c69e', fontSize: 10, marginTop: 5 },
  instructions: { flex: 1, gap: 6 }, instructionTitle: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#f1e5c4', fontSize: 17, marginBottom: 3 },
  instructionText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#b7be94', fontSize: 12 },
  dpad: { width: 108, height: 72 }, direction: { position: 'absolute', width: 34, height: 34, borderWidth: 2, borderColor: '#657056', backgroundColor: '#354b39', justifyContent: 'center', alignItems: 'center' },
  up: { left: 37, top: 0 }, left: { left: 0, top: 37 }, down: { left: 37, top: 37 }, right: { left: 74, top: 37 }, directionPressed: { backgroundColor: '#708450', borderColor: '#ebce81' },
  mobileHint: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, fontSize: 10, color: '#b7be94', textAlign: 'center', paddingTop: 6, paddingBottom: 10 },
});
