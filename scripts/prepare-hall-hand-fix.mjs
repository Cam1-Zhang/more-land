import sharp from 'sharp';
import {copyFile} from 'node:fs/promises';
const source=process.argv[2] ?? 'assets/hall/source/momo-daisy-front-hands.png';
if(process.argv[2]) await copyFile(source,'assets/hall/source/momo-daisy-front-hands.png');
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const targets=[['assets/hall/momo-seated.png','assets/hall/momo-seated-v2.png'],['assets/hall/roster/7.png','assets/hall/roster/7-v2.png']];
for(const [col,[original,output]] of targets.entries()){
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=Math.floor(col*info.width/2);x<Math.floor((col+1)*info.width/2);x++)if(data[(y*info.width+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const box={left,top,width:right-left+1,height:bottom-top+1};
 const scale=Math.min(84/box.height,58/box.width),width=Math.round(box.width*scale),height=Math.round(box.height*scale);
 const sprite=await sharp(source).extract(box).resize(width,height,{kernel:'nearest'}).png().toBuffer();
 const tile=await sharp({create:{width:64,height:96,channels:4,background:'#00000000'}}).composite([{input:sprite,left:Math.floor((64-width)/2),top:92-height}]).raw().toBuffer();
 const originalPixels=await sharp(original).ensureAlpha().raw().toBuffer();
 for(let y=0;y<96;y++)tile.copy(originalPixels,y*128*4,y*64*4,(y+1)*64*4);
 await sharp(originalPixels,{raw:{width:128,height:192,channels:4}}).png().toFile(output);
}
console.log('Updated front hands only; other three directions preserved.');
