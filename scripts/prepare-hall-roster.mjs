import sharp from 'sharp';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
const names = JSON.parse(await readFile('assets/hall/roster/manifest.json', 'utf8'));
const [groupText, source] = process.argv.slice(2);
const outputDir = process.argv[4] ?? 'assets/hall/roster';
const uniformHeight = process.argv.includes('--uniform-height');
const pixelGrid = process.argv.includes('--pixel-grid');
const pixelStep = Number(process.argv.find(arg => arg.startsWith('--pixel-step='))?.split('=')[1] ?? 2);
if (![1, 2].includes(pixelStep)) throw new Error('--pixel-step must be 1 or 2');
const includeReferences = process.argv.includes('--include-references');
const frameWidth = uniformHeight ? 80 : 64;
const sourceDir = process.argv[4] ? `${outputDir}/source` : 'assets/hall/source';
const group = Number(groupText);
if (!source || !Number.isInteger(group) || group < 0 || group > 5) throw new Error('Usage: prepare-hall-roster.mjs group(0..5) source');
await mkdir(outputDir, { recursive: true });
await mkdir(sourceDir, { recursive: true });
await copyFile(source, `${sourceDir}/roster-${group}.png`);
const {data,info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
// Generated gutters are not always perfectly equidistant. Find transparent
// separators near each nominal grid line instead of cutting through boots/hair.
function separators(axis, count) {
  const length = axis === 'x' ? info.width : info.height;
  const projection = new Array(length).fill(0);
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++) {
    if(data[(y*info.width+x)*4+3]>=128) projection[axis==='x'?x:y]++;
  }
  const cuts=[0];
  for(let i=1;i<count;i++) {
    const expected=i*length/count, radius=length/count*0.43;
    const start=Math.max(cuts.at(-1)+1,Math.floor(expected-radius)),end=Math.min(length-1,Math.ceil(expected+radius));
    const min=Math.min(...projection.slice(start,end+1));
    const runs=[];
    for(let p=start;p<=end;p++)if(projection[p]===min){const a=p;while(p<end&&projection[p+1]===min)p++;runs.push({mid:Math.round((a+p)/2),width:p-a+1});}
    runs.sort((a,b)=>b.width-a.width||Math.abs(a.mid-expected)-Math.abs(b.mid-expected));
    cuts.push(runs[0].mid);
  }
  return [...cuts,length];
}
const xs=separators('x',8),ys=separators('y',4);
for (let col=0;col<8;col++) {
  const id=group*8+col+1;
  // Legacy batches retain Toby/Momo; the shared valley style includes them.
  if (id<=2 && !includeReferences) continue;
  const boxes=[];
  for(let row=0;row<4;row++) {
    let left=info.width, top=info.height, right=-1, bottom=-1;
    const x0=xs[col], x1=xs[col+1];
    const y0=ys[row], y1=ys[row+1];
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<left) throw new Error(`Empty ${names[id-1]} row ${row}`);
    boxes.push({left,top,width:right-left+1,height:bottom-top+1});
  }
  const scale=Math.min(84/Math.max(...boxes.map(b=>b.height)),58/Math.max(...boxes.map(b=>b.width)));
  const frames=await Promise.all(boxes.map(async(box,i)=>{
    // Match Toby/Momo's 84-pixel seated silhouette in each direction, rather
    // than letting one tall view shrink the other three views of a character.
    const frameScale = uniformHeight ? 84 / box.height : scale;
    const width=pixelGrid ? Math.max(2,Math.round(box.width*frameScale/2)*2) : Math.max(1,Math.round(box.width*frameScale));
    const height=uniformHeight ? 84 : Math.max(1,Math.round(box.height*frameScale));
    if (width > frameWidth) throw new Error(`${names[id-1]} view ${i} is too wide (${width}px) at the reference height; correct the source silhouette instead of squeezing it.`);
    let input;
    if (pixelGrid) {
      // Keep the source's eye whites and pupils at the final sprite resolution.
      // A 2px grid is available for coarse artwork, but loses facial features
      // when an 84px character is first reduced to only 42px.
      const small = await sharp(source).extract(box).resize(width/pixelStep,height/pixelStep,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      for(let p=3;p<small.data.length;p+=4) small.data[p]=small.data[p]>=128 ? 255 : 0;
      const indexed=await sharp(small.data,{raw:small.info}).png({palette:true,colours:32,dither:0}).toBuffer();
      input=await sharp(indexed).resize(width,height,{kernel:'nearest'}).png().toBuffer();
    } else {
      input=await sharp(source).extract(box).resize(width,height,{kernel:'nearest'}).png().toBuffer();
    }
    return {input,left:(i%2)*frameWidth+Math.floor((frameWidth-width)/2),top:Math.floor(i/2)*96+92-height};
  }));
  await sharp({create:{width:frameWidth*2,height:192,channels:4,background:'#00000000'}}).composite(frames).png().toFile(`${outputDir}/${id}.png`);
}
console.log(`Normalized group ${group}: ${names.slice(group*8,group*8+8).join(', ')}`);
