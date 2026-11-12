import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';
const [standingSource, seatedSource] = process.argv.slice(2);
const seatedTemplate = process.argv.includes('--seated-template');
const standingRows = Number(process.argv.find(arg => arg.startsWith('--standing-rows='))?.split('=')[1] ?? 4);
const folder = 'assets/avatar-creator/personal';
if (!standingSource || !seatedSource) throw new Error('Pass the 6×4 standing source (first row used) and 6×4 seated atlas.');
await mkdir(`${folder}/source`, { recursive: true });
const frames = [];
async function importAtlas(source, filename, rows, columnMap = [0,1,2,3,4,5], sourceColumns = 6, sourceRows = 4) {
  await copyFile(source, `${folder}/source/${filename}.png`);
  const {data, info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Locate transparent gutters: generated cells need not be perfectly equidistant.
  function cuts(axis, count) {
    const len = axis === 'x' ? info.width : info.height, projection = new Array(len).fill(0);
    for (let y=0;y<info.height;y++) for (let x=0;x<info.width;x++) if(data[(y*info.width+x)*4+3]>=128) projection[axis==='x'?x:y]++;
    const result=[0];
    for(let i=1;i<count;i++) {
      const expected=i*len/count,start=Math.max(result.at(-1)+1,Math.floor(expected-len/count*.42)),end=Math.ceil(expected+len/count*.42);
      const min=Math.min(...projection.slice(start,end)),runs=[];
      for(let n=start;n<end;n++) if(projection[n]===min) {const a=n;while(n+1<end&&projection[n+1]===min)n++;runs.push({pos:Math.round((a+n)/2),width:n-a+1});}
      runs.sort((a,b)=>b.width-a.width||Math.abs(a.pos-expected)-Math.abs(b.pos-expected));result.push(runs[0].pos);
    }
    return [...result,len];
  }
  const xs=cuts('x',sourceColumns),ys=cuts('y',sourceRows);
  for (const [sourceRow, outputRow] of rows) for(let col=0;col<6;col++) {
    const sourceCol=columnMap[col];
    let l=info.width,r=-1,t=info.height,b=-1;
    for(let y=ys[sourceRow];y<ys[sourceRow+1];y++)for(let x=xs[sourceCol];x<xs[sourceCol+1];x++)if(data[(y*info.width+x)*4+3]>=128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    if(r<l)throw new Error(`Empty cell ${sourceRow},${col}`);
    const width=Math.round((r-l+1)*84/(b-t+1));if(width>80)throw new Error('Figure exceeds cell');
    const frame=await sharp(source).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize(width,84,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let p=3;p<frame.data.length;p+=4)frame.data[p]=frame.data[p]>=128?255:0;
    frames.push({input:await sharp(frame.data,{raw:frame.info}).png({palette:true,colours:32,dither:0}).toBuffer(),left:col*80+Math.floor((80-width)/2),top:outputRow*96+8});
  }
}
await importAtlas(standingSource,'standing',[[0,0]],[0,1,2,3,4,5],6,standingRows);
await importAtlas(seatedSource,'seated',[[0,1],[1,2],[2,3],[3,4]],seatedTemplate ? [0,2,4,1,3,6] : [0,1,2,3,4,5],seatedTemplate ? 8 : 6);
await sharp({create:{width:480,height:480,channels:4,background:'#00000000'}}).composite(frames).png().toFile(`${folder}/avatars.png`);
console.log('Prepared six complete avatars, 84px visible height, centered, standing and four seated directions.');
