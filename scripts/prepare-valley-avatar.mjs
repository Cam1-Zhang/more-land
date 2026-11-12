import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const folder='assets/avatar-creator/valley';
const source=`${folder}/source/characters.png`;
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const hair=['#111111','#3A2418','#8B5A2B','#D8B45F','#9A342A','#C9C9C9','#D977A7','#3F6FB5','#4F8A45'];
const skin=['#f7cfa0','#edb783','#dda06a','#ba7d49','#915b37','#68402c'];
const rgb=hex=>[1,3,5].map(p=>parseInt(hex.slice(p,p+2),16));
const heads=[],bodies=[];
for(let pose=0;pose<2;pose++)for(let col=0;col<8;col++){
 const x0=Math.floor(col*info.width/8),x1=Math.floor((col+1)*info.width/8),y0=pose?448:0,y1=pose?info.height:448,neck=pose?627:224;
 let l=x1,r=x0,t=y1,b=y0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 const cx=(l+r+1)/2;
 for(const part of ['head','body']){
  const top=part==='head'?t:neck,bottom=part==='head'?neck:b+1;
  const targetHeight=part==='head'?(pose?42:36):(pose?42:48);
  const crop={left:l,top,width:r-l+1,height:bottom-top};
  const width=Math.round(crop.width*targetHeight/crop.height);
  const input=await sharp(source).extract(crop).resize(width,targetHeight,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const target=part==='head'?heads:bodies;
  target.push({data:input.data,info:input.info,left:col*80+Math.round(40-(cx-l)*targetHeight/crop.height),top:pose*96+(part==='head'?8:(pose?50:44))});
 }
}
function recolor(frame,skinIndex,hairIndex){
 const output=Buffer.from(frame.data),skinTarget=rgb(skin[skinIndex]),hairTarget=hairIndex===null?null:rgb(hair[hairIndex]);
 for(let i=0;i<output.length;i+=4){
  if(output[i+3]<128){output[i+3]=0;continue;} output[i+3]=255;
  const [r,g,b]=output.subarray(i,i+3);
  const isSkin=r>145&&g/r>.53&&g/r<.85&&b/r>.28&&b/r<.70&&r-g>25&&g-b>17;
  if(isSkin){const lum=(r+g+b)/3;const shade=Math.min(1.12,lum/175);for(let c=0;c<3;c++)output[i+c]=Math.min(255,Math.round(skinTarget[c]*shade));}
  else if(hairTarget&&Math.max(r,g,b)-Math.min(r,g,b)<36&&r>55&&r<233){
   const value=(r+g+b)/3/255;
   for(let c=0;c<3;c++)output[i+c]=Math.round(value<.5?hairTarget[c]*(.36+value*1.28):hairTarget[c]+(255-hairTarget[c])*(value-.5)*1.25);
  }
 }
 return sharp(output,{raw:frame.info}).png().toBuffer();
}
for(let sk=0;sk<6;sk++){
 for(let hc=0;hc<9;hc++){
  const layers=await Promise.all(heads.map(async f=>({input:await recolor(f,sk,hc),left:f.left,top:f.top})));
  await sharp({create:{width:640,height:192,channels:4,background:'#00000000'}}).composite(layers).png().toFile(`${folder}/heads-${sk}-${hc}.png`);
 }
 const layers=await Promise.all(bodies.map(async f=>({input:await recolor(f,sk,null),left:f.left,top:f.top})));
 await sharp({create:{width:640,height:192,channels:4,background:'#00000000'}}).composite(layers).png().toFile(`${folder}/outfits-${sk}.png`);
}
let module='// Generated artwork with pre-exported palettes; identical on web and native.\nexport const VALLEY_HEADS = [\n';
for(let sk=0;sk<6;sk++)module+='  ['+hair.map((_,hc)=>`require('../../assets/avatar-creator/valley/heads-${sk}-${hc}.png')`).join(',')+'],\n';
module+='];\nexport const VALLEY_OUTFITS = ['+skin.map((_,sk)=>`require('../../assets/avatar-creator/valley/outfits-${sk}.png')`).join(',')+'];\n';
await writeFile('src/constants/valleyAvatarAssets.ts',module);
console.log('Prepared generated heads/outfits, 6 skin palettes × 9 hair palettes, standing + drawn seated poses.');
