
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
names = ["scr_13.3.png","scr_12.07.png","scr_14.57.png"]
labels = ["no scratch (t=13.3)","scratch (t=12.07)","t=14.57"]
ims = [Image.open(os.path.join(d,"shots",n)).convert("RGB").crop((330,200,470,760)) for n in names]
w,h = ims[0].size
out = Image.new("RGB",(w*3+16, h+22),(10,10,10))
for i,(im,lb) in enumerate(zip(ims,labels)):
    out.paste(im,(i*(w+8),22)); ImageDraw.Draw(out).text((i*(w+8)+4,6),lb,fill=(240,240,240))
out.save(os.path.join(d,"shots","scratch_cmp2.png"))
print(out.size)
