/** AsyncStorage：全应用背景音乐开关（Hub 与对局各一首 BGM，共用此 key；默认开）。 */
export const HUB_BGM_ENABLED_KEY = 'ai_werewolf_hub_bgm_enabled';
/** AsyncStorage：对局内法官播报、狼嚎等（非 BGM；默认开；Hub 页无音效）。 */
export const GAME_SFX_ENABLED_KEY = 'ai_werewolf_game_sfx_enabled';
/** AsyncStorage：AI 玩家发言的云端 TTS；关闭后不得请求 MiniMax（默认关）。 */
export const AI_VOICE_ENABLED_KEY = 'ai_werewolf_ai_voice_enabled';

/** AsyncStorage：主页「设置」里编辑的昵称与头像（对局里「我」的展示）。 */
export const USER_NICKNAME_KEY = 'ai_werewolf_user_nickname';
export const USER_AVATAR_INDEX_KEY = 'ai_werewolf_user_avatar_index';
export const USER_NICKNAME_MAX_LEN = 16;
/** AsyncStorage：设置页「云模型」开关。关=强制本地 Ollama。 */
export const CLOUD_MODEL_ENABLED_KEY = 'ai_werewolf_cloud_model_enabled';
