"""Build architectural guides and matching collision data, not finished game art.

Each home has an explicitly authored plan. Imagegen paints the final pixel art
from these guides; this script never modifies generated artwork.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
# role, grid column, grid row, width, height; 160 x 128 world-unit modules.
PLANS = {
 'frankFamilyHome': [('bed',0,0,1,1),('double',1,0,2,1),('bed',3,0,1,1),('kitchen',0,1,1,2),('hall',1,1,1,1),('living',2,1,2,2),('hall',1,2,1,1)],
 'hankFamilyHome': [('bed',0,0,1,1),('kitchen',1,0,2,1),('bed',3,0,1,1),('bed',0,1,1,1),('living',1,1,3,1),('hall',0,2,3,1)],
 'moriFamilyHome': [('study',0,0,2,1),('bed',2,0,1,1),('bed',3,0,1,1),('bed',0,1,1,1),('hall',1,1,2,1),('kitchen',3,1,1,1),('living',1,2,2,1)],
 'kasparFamilyHome': [('bed',0,0,1,1),('living',1,0,2,1),('bed',3,0,1,1),('hall',0,1,3,1),('bed',3,1,1,1),('kitchen',0,2,1,1),('study',1,2,2,1)],
 'socratesFamilyHome': [('study',1,0,1,1),('bed',1,1,1,1),('living',2,1,1,1),('kitchen',1,2,1,1),('hall',2,2,1,1)],
 'justiceFamilyHome': [('bed',0,0,1,1),('bed',1,0,1,1),('study',2,0,2,1),('living',0,1,3,1),('bed',3,1,1,1),('hall',1,2,1,1),('kitchen',2,2,2,1)],
 'oldFoxFamilyHome': [('kitchen',0,0,1,1),('living',1,0,2,1),('bed',3,0,1,1),('bed',0,1,1,1),('hall',1,1,2,1),('study',3,1,1,1),('bed',0,2,1,1),('hall',1,2,2,1)],
 'noraFamilyHome': [('bed',0,0,1,1),('kitchen',1,0,1,1),('bed',0,1,1,1),('living',1,1,2,1),('hall',1,2,2,1)],
 'victorFamilyHome': [('bed',0,0,1,1),('kitchen',1,0,2,1),('bed',3,0,1,1),('living',0,1,4,1),('hall',1,2,2,1)],
 'peterHome': [('bed',0,1,1,1),('study',1,1,1,1),('kitchen',0,2,1,1),('living',1,2,2,1)],
 'widowHome': [('bed',2,0,1,1),('living',1,1,2,1),('kitchen',1,2,1,1),('study',2,2,1,1)],
 'ghostHome': [('study',0,0,2,1),('gallery',2,0,1,1),('living',0,1,2,1),('gallery',2,1,1,1),('hall',1,2,2,1)],
 'godEyeHome': [('study',2,0,2,1),('bed',2,1,1,1),('kitchen',3,1,1,1),('living',1,2,3,1)],
 'devinIvyHome': [('bed',1,0,1,1),('study',2,0,1,1),('bed',3,0,1,1),('kitchen',1,1,1,1),('living',2,1,2,1),('hall',1,2,2,1)],
 'sarahJulianHome': [('double',0,0,2,1),('study',0,1,1,1),('living',1,1,2,1),('kitchen',1,2,1,1),('hall',2,2,1,1)],
 'mikeClaraHome': [('kitchen',0,1,1,1),('living',1,1,2,1),('double',3,1,1,1),('study',0,2,1,1),('hall',1,2,3,1)],
 'oscarJillHome': [('double',1,0,1,1),('kitchen',2,0,1,1),('living',1,1,2,1),('study',1,2,1,1),('hall',2,2,1,1)],
 'mageElenaHome': [('double',0,0,1,1),('study',1,0,1,1),('kitchen',0,1,1,1),('living',1,1,3,1),('hall',1,2,1,1),('gallery',2,2,2,1)],
 'vesperXanderHome': [('bed',0,1,1,1),('living',1,1,2,1),('bed',3,1,1,1),('kitchen',0,2,1,1),('hall',1,2,2,1),('study',3,2,1,1)],
 'tomBrothersHome': [('bed',0,0,1,1),('kitchen',1,0,1,1),('bed',0,1,1,1),('living',1,1,3,1),('bed',0,2,1,1),('hall',1,2,2,1),('study',3,2,1,1)],
 'frostHome': [('bed',1,1,1,1),('study',2,1,1,1),('living',1,2,1,1),('kitchen',2,2,1,1)],
 'kaiserHome': [('bed',3,0,1,1),('study',2,1,1,1),('kitchen',3,1,1,1),('living',1,2,3,1)],
 'ambassadorHome': [('bed',0,0,1,1),('study',1,0,1,1),('kitchen',0,1,1,1),('living',1,1,2,1),('hall',1,2,2,1)],
 'ritaBenHome': [('bed',0,0,1,1),('study',0,1,1,1),('living',1,1,2,1),('bed',3,1,1,1),('kitchen',1,2,1,1),('hall',2,2,2,1)],
}
COLORS = {'bed':'#a9bbdf','double':'#a9bbdf','kitchen':'#d4b99b','living':'#c7d6b0','study':'#dbcbab','hall':'#e7dfcc','gallery':'#d6c6dd'}
all_plans={}
for home, spec in PLANS.items():
 rooms=[dict(role=t,x=64+c*160,y=40+r*128,w=w*160,h=h*128) for t,c,r,w,h in spec]
 # All openings are paired from the same adjacency calculation.
 openings={i:{side:[] for side in 'NESW'} for i in range(len(rooms))}
 for i,a in enumerate(rooms):
  for j,b in enumerate(rooms[:i]):
   if a['role'] in ('bed','double') and b['role'] in ('bed','double'): continue
   y0,y1=max(a['y'],b['y']),min(a['y']+a['h'],b['y']+b['h'])
   x0,x1=max(a['x'],b['x']),min(a['x']+a['w'],b['x']+b['w'])
   if y1-y0>=80 and (a['x']+a['w']==b['x'] or b['x']+b['w']==a['x']):
    side='E' if a['x']<b['x'] else 'W';mid=(y0+y1)/2
    openings[i][side].append((mid-30,mid+30));openings[j]['W' if side=='E' else 'E'].append((mid-30,mid+30))
   if x1-x0>=80 and (a['y']+a['h']==b['y'] or b['y']+b['h']==a['y']):
    side='S' if a['y']<b['y'] else 'N';mid=(x0+x1)/2
    openings[i][side].append((mid-30,mid+30));openings[j]['N' if side=='S' else 'S'].append((mid-30,mid+30))
  if a['y']+a['h']==424 and a['x']<=384<=a['x']+a['w']:
   openings[i]['S'].append((350,418))
 walls=[];furniture=[];bed=0
 for i,r in enumerate(rooms):
  x,y,w,h=[r[k] for k in ('x','y','w','h')]
  for side in 'NESW':
   start,end=(x,x+w) if side in 'NS' else (y,y+h)
   cursor=start
   for lo,hi in sorted(openings[i][side])+[(end,end)]:
    lo=max(start,min(end,lo));hi=max(start,min(end,hi))
    if lo>cursor:
     walls.append(dict(x=cursor if side in 'NS' else x if side=='W' else x+w-8,y=y if side=='N' else y+h-8 if side=='S' else cursor,w=lo-cursor if side in 'NS' else 8,h=8 if side in 'NS' else lo-cursor))
    cursor=max(cursor,hi)
  def obj(id,kind,label,rx,ry,rw,rh,px,py,seat=None):
   v=dict(id=id,kind=kind,label=label,rect=dict(x=rx,y=ry,w=rw,h=rh),x=px,y=py)
   if seat:v['seat']=seat
   furniture.append(v)
  role=r['role']
  if role in ('bed','double'):
   bed+=1;bw=64 if role=='double' else 42
   bx=x+w-bw-22 if openings[i]['W'] else x+22
   obj(f'bed-{bed}','bed','床',bx,y+22,bw,66,bx+bw+15 if bx<x+w/2 else bx-15,y+66)
  elif role=='kitchen':
   # Counter against a wall without a door, leaving a free approach.
   if not openings[i]['N']: obj('kitchen','kitchen','厨房料理台',x+24,y+18,w-48,30,x+w/2,y+66)
   else:
    kx=x+w-50 if openings[i]['W'] else x+20
    obj('kitchen','kitchen','厨房料理台',kx,y+20,30,h-40,kx-18 if openings[i]['W'] else kx+48,y+h/2)
  elif role=='living':
   if w==160:
    obj('sofa','chair','客厅扶手椅',x+w-52,y+52,32,48,x+w-72,y+76,dict(x=x+w-36,y=y+80,facing='left'))
    obj('table','table','起居室茶桌',x+22,y+78,42,28,x+82,y+92)
   else:
    sx=x+w-100
    if any(sx<hi and sx+72>lo for lo,hi in openings[i]['N']):sx=x+112
    obj('sofa','chair','客厅沙发',sx,y+18,72,32,sx-20,y+42,dict(x=sx+36,y=y+43,facing='down'))
    obj('table','table','起居室茶桌',sx+8,y+68,56,28,sx-12,y+84)
  elif role=='study':
   obj('desk','desk','书桌',x+24,y+24,58,30,x+53,y+76)
   obj('shelf','shelf','书架',x+w-54,y+18,30,48,x+w-74,y+42)
  elif role=='gallery':
   obj(f'cabinet-{i}','wardrobe','收藏柜',x+22,y+18,54,28,x+48,y+66)
  if role in ('hall','living') and not any(f['id']=='album' for f in furniture):
   obj('album','album','家中陈列',x+22,y+18,38,24,x+42,y+62)
 # The entry strip is real traversable flooring, not extra unexplained teleport.
 floors=[{k:r[k] for k in ('x','y','w','h')} for r in rooms]+[dict(x=350,y=416,w=68,h=80)]
 data=dict(rooms=rooms,floors=floors,walls=walls,furniture=furniture)
 all_plans[home]=data
 im=Image.new('RGB',(1536,1024),'#141921');d=ImageDraw.Draw(im)
 for r in rooms:d.rectangle((r['x']*2,r['y']*2,(r['x']+r['w'])*2,(r['y']+r['h'])*2),fill=COLORS[r['role']])
 d.rectangle((700,832,836,992),fill=COLORS['hall'])
 for r in walls:d.rectangle((r['x']*2,r['y']*2,(r['x']+r['w'])*2,(r['y']+r['h'])*2),fill='#685448')
 for f in furniture:
  r=f['rect'];d.rectangle((r['x']*2,r['y']*2,(r['x']+r['w'])*2,(r['y']+r['h'])*2),fill={'bed':'#526aab','chair':'#36684c','kitchen':'#ba6a38'}.get(f['kind'],'#92703b'))
  d.text((r['x']*2+3,r['y']*2+3),f['kind'].upper(),fill='white')
 for r in rooms:d.text((r['x']*2+18,(r['y']+r['h']-20)*2),r['role'].upper(),fill='#343434')
 out=ROOT/'docs/mistbell/floorplan-guides';out.mkdir(exist_ok=True)
 im.save(out/f'{home}.png')
out=ROOT/'src/game/mistbell/homeInteriors.ts'
out.write_text("import {applyHomeMeasurements} from './homeInteriorMeasurements';\nimport type {HomePlace} from './types';\nimport type {Furniture} from './furniture';\ntype Rect={x:number;y:number;w:number;h:number};\nexport type HomeInterior={rooms:(Rect & {role:string})[];floors:Rect[];walls:Rect[];furniture:Furniture[]};\n// Authored house plans; guides are regenerated by scripts/build-home-floorplans.py.\nexport const HOME_INTERIORS:Record<HomePlace,HomeInterior>="+json.dumps(all_plans,ensure_ascii=False,indent=2)+";\napplyHomeMeasurements(HOME_INTERIORS);\n")
print(f'Built {len(all_plans)} individual plans and architectural guides.')
