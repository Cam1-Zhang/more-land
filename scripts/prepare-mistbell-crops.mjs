import sharp from 'sharp';
// Pack generated artwork, never synthesize or redraw plant pixels.
const source='assets/mistbell/crops-source.png';
const meta=await sharp(source).metadata(),cell=Math.floor(meta.width/3);
const bounds=[];
for(let i=0;i<3;i++){
 const {data,info}=await sharp(source).extract({left:i*cell,top:0,width:cell,height:meta.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=cell,y0=info.height,x1=-1,y1=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>127){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 if(x1<x0)throw new Error('Empty generated crop '+i);
 bounds.push({left:i*cell+x0,top:y0,width:x1-x0+1,height:y1-y0+1});
}
const ratio=20/Math.max(...bounds.map(b=>Math.max(b.width,b.height))),layers=[];
for(let i=0;i<3;i++){
 const b=bounds[i],w=Math.max(1,Math.round(b.width*ratio)),h=Math.max(1,Math.round(b.height*ratio));
 const image=await sharp(source).extract(b).resize(w,h,{kernel:'nearest'}).png().toBuffer();
 layers.push({input:image,left:i*24+Math.floor((24-w)/2),top:22-h});
}
await sharp({create:{width:72,height:24,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile('assets/mistbell/crops.png');
console.log('Packed three generated crop stages into a 72×24 transparent atlas.');

