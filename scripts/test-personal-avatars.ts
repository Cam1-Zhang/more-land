import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { PERSONAL_AVATARS, PERSONAL_AVATAR_SEATED_ROWS, getPersonalAvatar } from '../src/constants/personalAvatars';
const require = createRequire(import.meta.url);
require.extensions['.png'] = (module, filename) => { module.exports = filename; };
async function main() {
  const { parsePixelAvatarConfig, DEFAULT_AVATAR_BY_BODY_TYPE } = await import('../src/constants/avatarCreator');
  assert.equal(PERSONAL_AVATARS.length, 6);
  assert.deepEqual(PERSONAL_AVATAR_SEATED_ROWS, {down:1,left:2,right:3,up:4});
  for (const body of ['male', 'female']) assert.deepEqual(PERSONAL_AVATARS.filter(a => a.bodyType === body).map(a => a.style), ['亚比风', '可爱风', '正常风']);
  for (const avatar of PERSONAL_AVATARS) {
    const saved = JSON.stringify({ ...DEFAULT_AVATAR_BY_BODY_TYPE[avatar.bodyType], presetId: avatar.id });
    assert.equal(getPersonalAvatar(parsePixelAvatarConfig(saved)!).id, avatar.id);
  }
  assert.equal(getPersonalAvatar(parsePixelAvatarConfig('{"bodyType":"female"}')!).id, 'female-normal');
  assert.equal(getPersonalAvatar({presetId:'invalid'}).id, 'male-normal');
  const {data,info} = await sharp('assets/avatar-creator/personal/avatars.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,480); assert.equal(info.height,480);
  for(let row=0;row<5;row++)for(let col=0;col<6;col++) {
    let top=96,bottom=-1,left=80,right=-1;
    for(let y=0;y<96;y++)for(let x=0;x<80;x++){
      const alpha=data[((row*96+y)*480+col*80+x)*4+3];
      assert.ok(alpha===0||alpha===255);
      if(alpha){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
    }
    assert.equal(top,8);assert.equal(bottom,91);assert.ok(Math.abs((left+right+1)/2-40)<=1);
  }
  console.log('Six avatar choices round-trip correctly; legacy profiles fall back safely; all 30 poses match height and seat anchor.');
}
void main();
