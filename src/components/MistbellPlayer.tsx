import React from 'react';
import {Image,Platform,View} from 'react-native';
import {getPersonalAvatar} from '../constants/personalAvatars';
import type {PixelAvatarConfig} from '../constants/avatarCreator';
const sheets={
 'male-alt':require('../../assets/mistbell/player/male-alt.png'),
 'male-cute':require('../../assets/mistbell/player/male-cute.png'),
 'male-normal':require('../../assets/mistbell/player/male-normal.png'),
 'female-alt':require('../../assets/mistbell/player/female-alt.png'),
 'female-cute':require('../../assets/mistbell/player/female-cute.png'),
 'female-normal':require('../../assets/mistbell/player/female-normal.png'),
};
export default function MistbellPlayer({config,facing,frame}:{config:PixelAvatarConfig;facing:'down'|'up'|'left'|'right';frame:number}){
 const row={down:0,left:1,right:2,up:3}[facing];
 return <View pointerEvents="none" style={{width:40,height:48,overflow:'hidden'}}><Image source={sheets[getPersonalAvatar(config).id]} style={[{position:'absolute',width:160,height:192,left:-frame*40,top:-row*48},Platform.OS==='web'?{imageRendering:'pixelated'} as any:undefined]} resizeMode="stretch"/></View>;
}
