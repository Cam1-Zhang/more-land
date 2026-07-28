// 1. 从数据文件导入 CHARACTERS
import { CHARACTERS } from '../data/mockData';

// 2. 定义局部接口，确保与你 mockData 里的属性（personality）完全一致
interface AICharacter {
  id: string;
  name: string;
  personality: string; // 修正点：由 personalityTags[0] 改为 personality
  avatarIcon: string;
}

/**
 * AI 发言生成引擎
 * 根据 AI 的人格设定和游戏阶段生成对话文本
 */
export const generateAISpeech = (
  character: AICharacter, 
  role: string, 
  phase: string, 
  targetName?: string
) => {
  // 根据不同的性格字段返回对应的语言风格前缀
  const styles: Record<string, string> = {
    'Analytical': "Based on the objective facts and voting patterns, ",
    'Aggressive': "It's so obvious! I'm almost certain that ",
    'Emotional': "I'm really confused, but my gut tells me ",
    'Sarcastic': "Oh, what a 'brilliant' defense... but honestly, ",
    'Professional': "Following the standard strategy for this board, ",
    'Mysterious': "The truth is hidden in the shadows, but ",
  };

  // 匹配性格风格，如果没有匹配到则使用通用风格
  const baseStyle = styles[character.personality] || "I've been thinking, and ";

  // 3. 根据游戏阶段生成不同文本
  switch (phase) {
    case 'DISCUSSION':
      return `${character.name}: "${baseStyle}${targetName || 'someone here'} is acting very suspicious."`;
    
    case 'VOTING':
      return `${character.name}: "My vote goes to ${targetName || 'the player I suspect'}. No regrets."`;
    
    case 'NIGHT':
      return `${character.name} is silently making a move...`;
    
    default:
      return `${character.name} is observing the field.`;
  }
};