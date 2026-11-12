import sharp from 'sharp';
import {mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const [id,source]=process.argv.slice(2);
if(!source||!/^([1-9]|[1-3][0-9]|4[0-8])$/.test(id))throw new Error('Usage: id(1–48) generated-sheet.png');
const folder='assets/exploration/roster';
await mkdir(`${folder}/source`,{recursive:true});
if(resolve(source)!==resolve(`${folder}/source/${id}-walk.png`))await copyFile(source,`${folder}/source/${id}-walk.png`);
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
// Generated grids have slightly uneven gutters. Cut in the transparent gutter,
// rather than letting the previous row's boots enter the next character's crop.
function cuts(axis){
 const length=axis==='x'?info.width:info.height,projection=new Array(length).fill(0),result=[0];
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=128)projection[axis==='x'?x:y]++;
 for(let i=1;i<4;i++){
  const center=i*length/4,start=Math.floor(center-length/4*.22),end=Math.ceil(center+length/4*.22),runs=[];
  for(let p=start;p<end;p++)if(projection[p]===0){const a=p;while(p+1<end&&projection[p+1]===0)p++;runs.push({middle:Math.round((a+p)/2),width:p-a+1});}
  runs.sort((a,b)=>b.width-a.width||Math.abs(a.middle-center)-Math.abs(b.middle-center));
  if(!runs.length)throw new Error(`No clear ${axis} gutter ${i} in ${id}; review source sheet`);
  result.push(runs[0].middle);
 }
 return [...result,length];
}
const xs=cuts('x'),ys=cuts('y');
const boxes=[];
for(let row=0;row<4;row++)for(let col=0;col<4;col++){
 let l=info.width,t=info.height,r=-1,b=-1;
 for(let y=ys[row];y<ys[row+1];y++)for(let x=xs[col];x<xs[col+1];x++)if(data[(y*info.width+x)*4+3]>=128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 if(r<l)throw new Error(`Missing frame ${id} ${row} ${col}`);
 boxes.push({left:l,top:t,width:r-l+1,height:b-t+1});
}
const ratio=80/Math.max(...boxes.map(b=>b.height)),frames=[];
for(let i=0;i<16;i++){
 const b=boxes[i],width=Math.round(b.width*ratio),height=Math.round(b.height*ratio);
 if(width>78)throw new Error(`Oversize frame ${id}/${i}`);
 const f=await sharp(source).extract(b).resize(width,height,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let a=3;a<f.data.length;a+=4)f.data[a]=f.data[a]>=128?255:0;
 let bottom=height-1;
 while(bottom>0&&!Array.from({length:width},(_,x)=>f.data[(bottom*width+x)*4+3]).some(Boolean))bottom--;
 frames.push({input:await sharp(f.data,{raw:f.info}).png({palette:true,colours:32,dither:0}).toBuffer(),left:i%4*80+Math.floor((80-width)/2),top:Math.floor(i/4)*96+87-bottom});
}
await sharp({create:{width:320,height:384,channels:4,background:'#00000000'}}).composite(frames).png().toFile(`${folder}/${id}.png`);
console.log(`Prepared ${id}: 16 walking frames, uniform scale and feet baseline.`);
