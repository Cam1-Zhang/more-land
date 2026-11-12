import React, { useCallback, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Check } from 'lucide-react-native';
import PixelAvatarSprite from '../components/PixelAvatarSprite';
import type { Facing } from '../components/ExplorationSprite';
import { GameWoodButton } from '../components/GameWoodButton';
import HubDayNightBackground from '../components/HubDayNightBackground';
import { DEFAULT_AVATAR_BY_BODY_TYPE, USER_PIXEL_AVATAR_CONFIG_KEY, USER_PIXEL_AVATAR_TRANSFORMS_KEY, parsePixelAvatarConfig } from '../constants/avatarCreator';
import { PERSONAL_AVATARS, getPersonalAvatar, type PersonalAvatarId } from '../constants/personalAvatars';
import { APP_LANGUAGE_KEY, type AppLanguage } from '../i18n/appStrings';
import { GAME_PIXEL_CJK_FONT_FAMILY } from '../theme/pixelFont';

export default function AvatarCreatorScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [lang, setLang] = useState<AppLanguage>('zh');
  const [selected, setSelected] = useState<PersonalAvatarId>('male-normal');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pose, setPose] = useState<'standing' | 'seated'>('standing');
  const [facing, setFacing] = useState<Facing>('down');
  const zh = lang === 'zh';
  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(APP_LANGUAGE_KEY), AsyncStorage.getItem(USER_PIXEL_AVATAR_CONFIG_KEY)])
      .then(([language, raw]) => { if (active) { setLang(language === 'en' ? 'en' : 'zh'); setSelected(getPersonalAvatar(parsePixelAvatarConfig(raw) ?? {}).id); setReady(true); } })
      .catch(() => { if (active) setError('读取形象失败，请返回后重试。'); });
    return () => { active = false; };
  }, []));
  const avatar = getPersonalAvatar({ presetId: selected });
  const config = { ...DEFAULT_AVATAR_BY_BODY_TYPE[avatar.bodyType], presetId: selected };
  const save = async () => {
    if (saving || !ready) return;
    setSaving(true); setError('');
    try {
      await AsyncStorage.multiSet([[USER_PIXEL_AVATAR_CONFIG_KEY, JSON.stringify(config)], [USER_PIXEL_AVATAR_TRANSFORMS_KEY, '{}']]);
      navigation.goBack();
    } catch { setError(zh ? '保存失败，请重试。' : 'Could not save. Please retry.'); }
    finally { setSaving(false); }
  };
  const preview = <View style={[styles.preview, compact && styles.previewCompact]}>
    <Text style={styles.eyebrow}>{zh ? '我的游戏形象' : 'MY CHARACTER'}</Text>
    <View style={styles.stage}><PixelAvatarSprite config={config} size={compact ? 112 : 164} pose={pose} facing={facing} /></View>
    <View style={styles.poseRow}>{(['standing', 'seated'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: pose === value }} onPress={() => setPose(value)} style={[styles.poseButton, pose === value && styles.poseOn]}><Text style={styles.ink}>{value === 'standing' ? zh ? '站姿' : 'Standing' : zh ? '坐姿' : 'Seated'}</Text></TouchableOpacity>)}</View>
    {pose === 'seated' && <View style={styles.poseRow}>{([['down', '正面', 'Front'], ['left', '左侧', 'Left'], ['right', '右侧', 'Right'], ['up', '背面', 'Back']] as const).map(([value, label, english]) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={zh ? `${label}坐姿` : `${english} seated`} accessibilityState={{ selected: facing === value }} onPress={() => setFacing(value)} style={[styles.directionButton, facing === value && styles.poseOn]}><Text style={styles.ink}>{zh ? label : english}</Text></TouchableOpacity>)}</View>}
    <Text style={styles.previewTitle}>{zh ? avatar.style : avatar.styleEn}</Text>
    <Text style={styles.hint}>{zh ? '保存后，以这个形象进入\n狼人杀与阿瓦隆。' : 'Save this character to use it in\nWerewolf and Avalon.'}</Text>
  </View>;
  const gallery = <View style={styles.gallery}>{(['male','female'] as const).map(body => <View key={body} style={{ gap: 8 }}>
    <Text style={styles.groupTitle}>{body === 'male' ? zh ? '男生' : 'Boys' : zh ? '女生' : 'Girls'}</Text>
    <View style={styles.cards}>{PERSONAL_AVATARS.filter(item => item.bodyType === body).map(item => <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={`${body === 'male' ? '男生' : '女生'}${item.style}`} accessibilityState={{ selected: selected === item.id }} onPress={() => setSelected(item.id)} style={[styles.card, selected === item.id && styles.cardOn]}>
      {selected === item.id && <View style={styles.check}><Check size={14} color="#fff8df" /></View>}
      <PixelAvatarSprite config={{ ...DEFAULT_AVATAR_BY_BODY_TYPE[body], presetId: item.id }} size={compact ? Math.max(52, Math.min(90,(width - 120)/3)) : 112} />
      <Text style={styles.cardTitle}>{zh ? item.style : item.styleEn}</Text>
      {!compact && <Text style={styles.cardDetail}>{zh ? item.detail : item.detailEn}</Text>}
    </TouchableOpacity>)}</View>
  </View>)}</View>;
  return <HubDayNightBackground style={{ flex: 1 }}><SafeAreaView style={styles.safe}><View style={styles.shell}>
    <View style={styles.header}><GameWoodButton variant="icon" accessibilityLabel={zh ? '返回设置' : 'Back to settings'} onPress={() => navigation.goBack()}><ChevronLeft color="#fff3d8" size={22} /></GameWoodButton><View style={{ flex: 1, alignItems: 'center' }}><Text style={styles.title}>{zh ? '个人形象' : 'Your Character'}</Text><Text style={styles.subtitle}>{zh ? '挑一个喜欢的样子，走进狼人村' : 'Choose your look for the village'}</Text></View><View style={{ width: 44 }} /></View>
    {!ready ? <View style={styles.loading}><ActivityIndicator color="#754a2b" /><Text style={styles.error}>{error}</Text></View> : compact ? <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>{preview}{gallery}</ScrollView> : <View style={styles.columns}>{preview}<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>{gallery}</ScrollView></View>}
    {!!error && ready && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={styles.footer}><Text style={styles.footerHint}>{zh ? '男女各三款 · 完整形象选择' : 'Six complete character styles'}</Text><GameWoodButton variant="text" label={saving ? zh ? '保存中…' : 'Saving…' : zh ? '保存形象' : 'Save avatar'} disabled={!ready || saving} onPress={() => void save()} /></View>
  </View></SafeAreaView></HubDayNightBackground>;
}
const styles = StyleSheet.create({
  safe:{flex:1,padding:16,alignItems:'center',justifyContent:'center'},shell:{width:'100%',maxWidth:1020,maxHeight:780,flex:1,borderWidth:4,borderColor:'#70452a',borderRadius:8,backgroundColor:'#f4dfb7',overflow:'hidden'},
  header:{flexDirection:'row',alignItems:'center',padding:14,borderBottomWidth:3,borderBottomColor:'#bc8a52',backgroundColor:'#ecd09b'},title:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:25,fontWeight:'800',color:'#593921'},subtitle:{fontSize:12,color:'#89633f',marginTop:4},
  columns:{flex:1,flexDirection:'row'},preview:{width:290,padding:20,alignItems:'center',justifyContent:'center',backgroundColor:'#e8cb96',borderRightWidth:2,borderColor:'#c59860'},previewCompact:{width:'100%',borderRightWidth:0,padding:12},eyebrow:{fontSize:12,letterSpacing:2,color:'#79502e',marginBottom:12,fontWeight:'800'},
  stage:{width:'100%',minHeight:190,alignItems:'center',justifyContent:'center',backgroundColor:'#d4d4ad',borderWidth:2,borderColor:'#ae8c54',borderRadius:5,padding:12},poseRow:{flexDirection:'row',gap:8,marginTop:12},poseButton:{paddingHorizontal:16,paddingVertical:7,borderWidth:1,borderColor:'#b99059',borderRadius:3},directionButton:{paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:'#b99059',borderRadius:3},poseOn:{backgroundColor:'#b99059'},ink:{color:'#593921',fontSize:12},previewTitle:{marginTop:18,fontSize:18,fontWeight:'800',color:'#67442a'},hint:{marginTop:8,textAlign:'center',fontSize:12,lineHeight:19,color:'#876440'},
  gallery:{gap:16},groupTitle:{fontFamily:GAME_PIXEL_CJK_FONT_FAMILY,fontSize:17,color:'#6a4328',fontWeight:'800'},cards:{flexDirection:'row',gap:10},card:{flex:1,minWidth:0,alignItems:'center',paddingVertical:10,paddingHorizontal:4,borderWidth:2,borderColor:'#c9a674',borderRadius:5,backgroundColor:'#faebcb'},cardOn:{borderColor:'#795033',backgroundColor:'#f0d293'},cardTitle:{fontSize:14,fontWeight:'800',color:'#634128',marginTop:4},cardDetail:{fontSize:10,color:'#876440',marginTop:6,textAlign:'center'},check:{position:'absolute',right:6,top:6,width:22,height:22,alignItems:'center',justifyContent:'center',backgroundColor:'#795033',borderRadius:3},
  footer:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderTopWidth:3,borderTopColor:'#bc8a52',backgroundColor:'#ecd09b'},footerHint:{flex:1,fontSize:12,color:'#89633f'},error:{padding:10,color:'#9f332e',textAlign:'center'},loading:{flex:1,alignItems:'center',justifyContent:'center'},
});
