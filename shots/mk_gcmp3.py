
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
box = (520, 260, 900, 640)
items = [("pass5/06_altar.png","BEFORE tiled"),
         ("grain_test2.png","v2 soft clumps (default)"),
         ("grain_tv.png","v3 TV (tv=1, grain=0.10)")]
ims = [(Image.open(os.path.join(d,"shots",p)).convert("RGB").crop(box), t) for p,t in items]
w,h = ims[0][0].size
out = Image.new("RGB",(w*3+20, h+22),(10,10,10))
for i,(im,t) in enumerate(ims):
    out.paste(im,(i*(w+10),22)); ImageDraw.Draw(out).text((i*(w+10)+6,6),t,fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_compare3.png"))
print(out.size)
