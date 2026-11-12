import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, newValley, parseSave, SAVE_KEY } from './engine';
import type { Action, ValleyState } from './types';

export function useValleySave() {
  const [state,setState]=useState<ValleyState>(newValley);
  const ref=useRef(state), alive=useRef(true), queue=useRef(Promise.resolve());
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('读取存档…');
  const [message,setMessage]=useState('WASD / 方向键走路，E 互动；点击居民或田地会先走近。农舍旁的信箱里有一封信。');
  const [messageId,setMessageId]=useState(0);
  const notify=useCallback((text:string)=>{setMessage(text);setMessageId(id=>id+1);},[]);
  useEffect(()=>{alive.current=true; return()=>{alive.current=false;};},[]);
  const load=useCallback(async()=>{
    setError('');
    try { const value=parseSave(await AsyncStorage.getItem(SAVE_KEY)); if(!alive.current)return; ref.current=value;setState(value);setReady(true);setStatus('进度自动保存'); }
    catch(e) { if(alive.current){setError(e instanceof Error?e.message:'存档读取失败，请重试。');setStatus('存档未覆盖');} }
  },[]);
  useEffect(()=>{void load();},[load]);
  const save=useCallback((value:ValleyState)=>{
    setStatus('保存中…');
    queue.current=queue.current.catch(()=>undefined).then(()=>AsyncStorage.setItem(SAVE_KEY,JSON.stringify(value)));
    const own=queue.current;
    void own.then(()=>{if(alive.current&&queue.current===own)setStatus('已保存');}).catch(()=>{if(alive.current)setStatus('保存失败 · 点击重试');});
  },[]);
  const dispatch=useCallback((action:Action)=>{
    if(!ready)return;
    const result=act(ref.current,action);
    if(action.type!=='clock'&&action.type!=='openConversation')notify(result.message);
    if(result.state!==ref.current){ref.current=result.state;setState(result.state);save(result.state);}
  },[ready,save,notify]);
  return {state,ready,error,status,message,messageId,dispatch,load,retrySave:()=>save(ref.current),notify};
}

