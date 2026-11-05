
import sys, os, statistics
from PIL import Image, ImageChops
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","sc3_0.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","sc3_8.png")).convert("RGB")
diff = ImageChops.difference(a,b).convert("L")
W,H = diff.size; px = diff.load()
cols=[sum(px[x,y] for y in range(100,860,4))/190.0 for x in range(W)]
best=None
for x in range(40,W-40):
    base=statistics.median(cols[x-40:x+40]); s=cols[x]-base
    if best is None or s>best[1]: best=(x,s,cols[x],base)
print("peak x=%d col=%.2f base=%.2f delta=%.2f" % best)
x0=best[0]
print("profile:", [(x, round(cols[x],1)) for x in range(x0-6, x0+7)])
crop=(max(0,x0-40), 100, min(W,x0+40), 860)
crops = [im.crop(crop) for im in (a,b)]
w,h = crops[0].size
out = Image.new("RGB",(w*2+10,h+20),(10,10,10))
out.paste(crops[0],(0,20)); out.paste(crops[1],(w+10,20))
from PIL import ImageDraw
dr=ImageDraw.Draw(out); dr.text((4,4),"scratch=0",fill=(240,240,240)); dr.text((w+14,4),"scratch=8x",fill=(240,240,240))
out=out.resize((out.width*2,out.height*2), Image.NEAREST)
out.save(os.path.join(d,"shots","scr_shape.png"))
print("saved", out.size)
