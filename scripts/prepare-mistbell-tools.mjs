import sharp from 'sharp';
import {copyFile} from 'node:fs/promises';
const source=process.argv[2];if(!source)throw Error('Pass the generated transparent 3×2 tool sheet');
await copyFile(source,'assets/mistbell/tools-source.png');
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const frames=[];
for(let i=0;i<6;i++){
 const x0=Math.round(i%3*info.width/3),x1=Math.round((i%3+1)*info.width/3),y0=Math.round(Math.floor(i/3)*info.height/2),y1=Math.round((Math.floor(i/3)+1)*info.height/2);
 let l=x1,r=-1,t=y1,b=-1;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>=180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 if(r<l)throw Error(`Missing tool ${i}`);
 const ratio=28/Math.max(r-l+1,b-t+1),w=Math.round((r-l+1)*ratio),h=Math.round((b-t+1)*ratio);
 const f=await sharp(source).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize(w,h,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let n=3;n<f.data.length;n+=4)f.data[n]=f.data[n]>=180?255:0;
 frames.push({input:await sharp(f.data,{raw:f.info}).png({palette:true,colours:24,dither:0}).toBuffer(),left:i%3*32+Math.floor((32-w)/2),top:Math.floor(i/3)*32+Math.floor((32-h)/2)});
}
await sharp({create:{width:96,height:64,channels:4,background:'#00000000'}}).composite(frames).png().toFile('assets/mistbell/tools.png');
