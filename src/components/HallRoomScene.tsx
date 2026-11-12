import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { HALL, getHallViewport, getHallSeats, type HallOccupant, type HallSeat } from '../constants/hallScene';
import type { ExplorerId, Facing } from './ExplorationSprite';
import { PIXEL_ART_SPRITE } from '../theme/pixelArtImage';
import { getHallCharacterSprite, getHallCharacterFrameWidth } from '../constants/hallCharacterSprites';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';

const ROOM = require('../../assets/hall/room.png');
const TABLE = require('../../assets/hall/table.png');
const CHAIRS = require('../../assets/hall/chairs.png');
const SEATED: Record<ExplorerId, ImageSourcePropType> = {
  toby: require('../../assets/hall/valley/1.png'),
  momo: require('../../assets/hall/valley/2.png'),
};
const FRAME: Record<Facing, { x: number; y: number }> = {
  down: { x: 0, y: 0 }, left: { x: 1, y: 0 }, right: { x: 0, y: 1 }, up: { x: 1, y: 1 },
};
const SITTING_OFFSET: Record<Facing, { x: number; y: number }> = {
  down: { x: 0, y: 0 }, up: { x: 0, y: 0 },
  left: { x: -6, y: -12 }, right: { x: 6, y: -12 },
};
const ACTOR_SIZE = 0.9;
// Scale around the seated hip, so smaller figures still rest on the cushion.
const SEATED_HIP_Y = 56;

function DirectionSprite({ source, facing, width, height }: { source: ImageSourcePropType; facing: Facing; width: number; height: number }) {
  const frame = FRAME[facing];
  return <View pointerEvents="none" style={{ width, height, overflow: 'hidden' }}>
    <Image source={source} resizeMode="stretch" style={[PIXEL_ART_SPRITE, styles.absolute, {
      width: width * 2, height: height * 2, left: -frame.x * width, top: -frame.y * height,
    }]} />
  </View>;
}

function SeatedActor({ occupant, seat, scale, entryKey, renderHuman }: { occupant: HallOccupant; seat: HallSeat; scale: number; entryKey: number; renderHuman?: (width: number, facing: Facing) => React.ReactNode }) {
  const arrival = useRef(new Animated.Value(0)).current;
  const legacyHuman = occupant.id === 'me' && !renderHuman;
  const offset = SITTING_OFFSET[legacyHuman ? 'down' : seat.facing];
  const actorWidth = (legacyHuman ? 56 : getHallCharacterFrameWidth(occupant.characterId ?? occupant.id) * 84 / 96) * ACTOR_SIZE;
  const actorScale = scale * ACTOR_SIZE;
  useEffect(() => {
    arrival.setValue(0);
    const animation = Animated.timing(arrival, { toValue: 1, duration: 450, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [arrival, occupant.seatId, entryKey]);
  return <Animated.View pointerEvents="none" testID={`hall-actor-${occupant.id}`} style={[styles.absolute, {
    left: (seat.x - actorWidth / 2 + offset.x) * scale, top: (seat.y - 88 + offset.y + SEATED_HIP_Y * (1 - ACTOR_SIZE)) * scale,
    opacity: occupant.isAlive === false ? 0.4 : arrival, transform: [{ translateY: arrival.interpolate({ inputRange: [0, 1], outputRange: [-8 * scale, 0] }) }],
  }]}>
    {occupant.id === 'me' ? <View style={{ width: actorWidth * scale, height: 84 * actorScale, overflow: 'hidden', alignItems: 'center' }}>
      {renderHuman ? renderHuman(actorWidth * scale, seat.facing) : <Image source={occupant.avatarSource} style={[PIXEL_ART_SPRITE, { width: 48 * actorScale, height: 70 * actorScale }]} resizeMode="contain" />}
    </View> : <DirectionSprite source={getHallCharacterSprite(occupant.characterId ?? occupant.id) ?? SEATED[occupant.id as ExplorerId]} facing={seat.facing} width={actorWidth * scale} height={84 * actorScale} />}
  </Animated.View>;
}

function SeatLayer({ seat, occupant, scale, entryKey, renderHuman }: { seat: HallSeat; occupant?: HallOccupant; scale: number; entryKey: number; renderHuman?: (width: number, facing: Facing) => React.ReactNode }) {
  const chair = <DirectionSprite source={CHAIRS} facing={seat.facing} width={64 * scale} height={96 * scale} />;
  return <React.Fragment>
    <View pointerEvents="none" style={[styles.absolute, { left: (seat.x - 32) * scale, top: (seat.y - 92) * scale }]}>{chair}</View>
    {occupant ? <SeatedActor renderHuman={renderHuman} occupant={occupant} seat={seat} scale={scale} entryKey={entryKey} /> : null}
    {/* The entire near-side backrest, including its top rail, occludes the sitter.
        The atlas alpha preserves the silhouette and the gaps between the slats. */}
    {occupant && seat.facing === 'up' ? <View pointerEvents="none" testID={`hall-chair-front-${seat.id}`} style={[styles.absolute, {
      left: (seat.x - 32) * scale, top: (seat.y - 92) * scale,
    }]}>{chair}</View> : null}
  </React.Fragment>;
}

type HallRoomSceneProps = {
  width: number; height?: number; panX?: number; occupants: HallOccupant[]; selected?: string | null; seatCount?: number;
  furnished?: boolean; showLabels?: boolean; entryKey?: number; onSeatPress: (seatId: number) => void;
  match?: boolean; night?: boolean; renderHuman?: (width: number, facing: Facing) => React.ReactNode;
};

/** Matches the original screen-wide backdrop, independently of the HUD columns. */
export function MatchHallRoomScene(props: Omit<HallRoomSceneProps, 'width' | 'height' | 'match'>) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { backgroundColor: '#100c09' }]}
    onLayout={({ nativeEvent: { layout } }) => {
      const { width, height } = layout;
      setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
    }}>
    {viewport.width > 0 && viewport.height > 0 ? <HallRoomScene {...props} {...viewport} match /> : null}
  </View>;
}

const HallRoomScene = memo(function HallRoomScene({ width, height = width * HALL.height / HALL.width, panX = 0, occupants, selected, seatCount = 12, furnished = true, showLabels = true, entryKey = 0, onSeatPress, match = false, night = false, renderHuman }: HallRoomSceneProps) {
  const { scale: backdropScale, left, top } = getHallViewport(width, height, panX);
  // Shrink the whole seating arrangement around the table, keeping the room fixed.
  const furnitureRatio = match ? 0.9 : 1;
  const scale = backdropScale * furnitureRatio;
  const furnitureFrame = {
    left: (HALL.table.left + HALL.table.width / 2) * (backdropScale - scale),
    top: (HALL.table.top + HALL.table.height / 2) * (backdropScale - scale),
    width: HALL.width * scale,
    height: HALL.height * scale,
  };
  const orderedSeats = getHallSeats(seatCount);
  const seats = [...orderedSeats].sort((a, b) => a.y - b.y);
  const renderSeat = (seat: HallSeat) => <SeatLayer key={seat.id} renderHuman={renderHuman} seat={seat} scale={scale} entryKey={entryKey} occupant={occupants.find(actor => actor.seatId === seat.id)} />;
  return <View pointerEvents="box-none" testID="hall-room-scene" style={{ width, height, overflow: 'hidden' }}>
    <View pointerEvents="box-none" testID="hall-scene-world" style={{ position: 'absolute', width: HALL.width * backdropScale, height: HALL.height * backdropScale, left, top }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={ROOM} style={[StyleSheet.absoluteFill, PIXEL_ART_SPRITE, { width: '100%', height: '100%' }]} resizeMode="stretch" accessibilityLabel="木屋：壁炉、窗户、地毯和木地板" />
      </View>
      {furnished ? <View pointerEvents="none" style={[styles.absolute, furnitureFrame]}>
        {seats.filter(seat => seat.behindTable).map(renderSeat)}
        <View pointerEvents="none" testID="hall-table" style={[styles.absolute, {
          left: HALL.table.left * scale, top: HALL.table.top * scale, width: HALL.table.width * scale, height: HALL.table.height * scale,
        }]}>
          <Image source={TABLE} resizeMode="stretch" style={[StyleSheet.absoluteFill, PIXEL_ART_SPRITE, { width: '100%', height: '100%' }]} accessibilityLabel="独立的狼徽木圆桌" />
        </View>
        {seats.filter(seat => !seat.behindTable).map(renderSeat)}
      </View> : null}
      {night ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#0b123d', opacity: 0.34 }]} /> : null}
      {furnished ? <View pointerEvents="box-none" style={[styles.absolute, furnitureFrame]}>{orderedSeats.map((seat, index) => {
        const occupant = occupants.find(actor => actor.seatId === seat.id);
        const active = occupant?.id === selected;
        const marked = active || occupant?.highlighted || occupant?.speaking;
        const number = match ? index + 1 : seat.id + 1;
        const sideLabel = seat.facing === 'left' || seat.facing === 'right';
        return <Pressable key={seat.id} accessibilityRole="button" accessibilityLabel={`${number}号座位${occupant ? `，${occupant.name}` : '，空座'}${occupant?.isAlive === false ? '，已出局' : ''}`}
          testID={`hall-seat-${seat.id}`} accessibilityState={{ selected: !!marked, disabled: occupant?.isAlive === false }} onPress={() => onSeatPress(seat.id)}
          style={[styles.absolute, styles.seatTarget, { left: (seat.x - 42) * scale, top: (seat.y - 114) * scale, width: 84 * scale, height: 139 * scale, zIndex: occupant?.speech ? 20 : 1 }]}>
          {occupant?.badge ? <Text pointerEvents="none" style={[styles.status, { fontSize: Math.max(12, 16 * scale) }]}>{occupant.badge}</Text> : null}
          {marked ? <View pointerEvents="none" style={[styles.selectedDiamond, { top: 23 * scale, backgroundColor: active ? '#ffe1a0' : '#98dfb4' }]} /> : null}
          {occupant?.stickerSource ? <Image source={occupant.stickerSource} style={[styles.sticker, PIXEL_ART_SPRITE]} resizeMode="contain" /> : null}
          {occupant?.speech ? <View pointerEvents="none" style={[styles.speech, { left: seat.x < HALL.seatCenter.x ? 0 : undefined, right: seat.x >= HALL.seatCenter.x ? 0 : undefined }]}>
            <Text numberOfLines={4} style={styles.speechText}>{occupant.speech}</Text>
          </View> : null}
          {showLabels ? <Pressable accessible={false} focusable={false} onPress={event => { event.stopPropagation(); onSeatPress(seat.id); }} style={[styles.label, marked && styles.activeLabel,
            sideLabel ? { transform: [{ translateX: (seat.facing === 'left' ? -74 : 74) * scale }, { translateY: -30 * scale }] } : null]}>
            <Text numberOfLines={1} style={[styles.labelText, { fontSize: Math.max(9, 11 * scale), color: occupant?.isAlive === false ? '#aaa' : '#f1d3a2' }]}>{match ? `${number} · ` : ''}{occupant ? occupant.name : String(number).padStart(2, '0')}{occupant?.isAlive === false ? ' ×' : ''}</Text>
          </Pressable> : null}
          {occupant?.tally ? <Text pointerEvents="none" style={styles.tally}>{occupant.tally}</Text> : null}
        </Pressable>;
      })}</View> : null}
    </View>
  </View>;
});

export default HallRoomScene;

const styles = StyleSheet.create({
  status: { position: 'absolute', top: 0, textAlign: 'center' },
  sticker: { position: 'absolute', top: -26, width: 50, height: 50 },
  speech: { position: 'absolute', bottom: '92%', width: 190, padding: 9, backgroundColor: '#ffedc9', borderColor: '#6a4429', borderWidth: 2, borderRadius: 5 },
  speechText: { fontSize: 12, lineHeight: 17, color: '#392517' },
  tally: { position: 'absolute', top: '100%', color: '#fff', fontSize: 12 },
  absolute: { position: 'absolute' },
  seatTarget: { alignItems: 'center', justifyContent: 'flex-end' },
  selectedDiamond: { position: 'absolute', width: 7, height: 7, backgroundColor: '#ffe1a0', transform: [{ rotate: '45deg' }] },
  label: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#20130cbb', borderWidth: 1, borderColor: '#8b613b88' },
  activeLabel: { borderColor: '#e1b870', backgroundColor: '#49301c' },
  labelText: { fontFamily: GAME_PIXEL_CJK_FONT_FAMILY, color: '#f1d3a2' },
});
