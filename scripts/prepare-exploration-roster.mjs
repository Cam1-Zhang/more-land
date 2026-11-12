import sharp from 'sharp';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
const [source, ...args] = process.argv.slice(2);
const ids = args.map(Number);
if (!source || ids.length !== 4 || ids.some(id => !Number.isInteger(id) || id < 1 || id > 48)) throw new Error('Usage: source.png topLeftID topRightID bottomLeftID bottomRightID');
const folder = 'assets/exploration/roster';
await mkdir(`${folder}/source`, {recursive:true});
await copyFile(source,`${folder}/source/${ids.join('-')}.png`);
const {data,info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
function cuts(axis) {
  const size=axis==='x'?info.width:info.height, projection=new Array(size).fill(0), result=[0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=128)projection[axis==='x'?x:y]++;
  for(let i=1;i<8;i++){
    const center=i*size/8,start=Math.max(result.at(-1)+1,Math.floor(center-size/8*.3)),end=Math.min(size,Math.ceil(center+size/8*.3));
    const min=Math.min(...projection.slice(start,end)),runs=[];
    for(let p=start;p<end;p++)if(projection[p]===min){const a=p;while(p+1<end&&projection[p+1]===min)p++;runs.push({mid:Math.round((a+p)/2),width:p-a+1});}
    runs.sort((a,b)=>b.width-a.width||Math.abs(a.mid-center)-Math.abs(b.mid-center));result.push(runs[0].mid);
  }
  return [...result,size];
}
const xs=cuts('x'),ys=cuts('y');
for(let actor=0;actor<4;actor++){
  // Toby and Momo already have approved walking animations.
  if(ids[actor]<=2)continue;
  const boxes=[];
  for(let row=0;row<4;row++)for(let frame=0;frame<4;frame++){
    const col=actor%2*4+frame,rw=Math.floor(actor/2)*4+row;
    let l=info.width,t=info.height,r=-1,b=-1;
    for(let y=ys[rw];y<ys[rw+1];y++)for(let x=xs[col];x<xs[col+1];x++)if(data[(y*info.width+x)*4+3]>=128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    if(r<l)throw new Error(`Missing ${ids[actor]} direction${row} frame${frame}`);
    boxes.push({left:l,top:t,width:r-l+1,height:b-t+1});
  }
  // One scale for all 16 frames keeps the gait from pulsing or changing body proportions.
  const ratio=80/Math.max(...boxes.map(b=>b.height));
  const frames=[];
  for(let i=0;i<16;i++){
    const box=boxes[i],width=Math.round(box.width*ratio),height=Math.round(box.height*ratio);
    if(width>76)throw new Error(`Character ${ids[actor]} is wider than the sprite cell: ${width}`);
    const sprite=await sharp(source).extract(box).resize(width,height,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let a=3;a<sprite.data.length;a+=4)sprite.data[a]=sprite.data[a]>=128?255:0;
    frames.push({input:await sharp(sprite.data,{raw:sprite.info}).png({palette:true,colours:32,dither:0}).toBuffer(),left:i%4*80+Math.floor((80-width)/2),top:Math.floor(i/4)*96+88-height});
  }
  await sharp({create:{width:320,height:384,channels:4,background:'#00000000'}}).composite(frames).png().toFile(`${folder}/${ids[actor]}.png`);
  console.log(`${ids[actor]}: four directions × four frames, 80px max height, baseline 88`);
}
