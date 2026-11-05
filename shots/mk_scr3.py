
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","scr_13.3.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","scr_12.07.png")).convert("RGB")
c = Image.open(os.path.join(d,"shots","scr_14.57.png")).convert("RGB")
crops = [("x430-480  no scratch", a.crop((430,100,480,860))),
         ("x430-480  scratch ep19", b.crop((430,100,480,860))),
         ("x740-790  scratch ep23", c.crop((740,100,790,860)))]
w,h = crops[0][1].size
out = Image.new("RGB",(w*3+16,h+22),(10,10,10))
for i,(lb,im) in enumerate(crops):
    out.paste(im,(i*(w+8),22)); ImageDraw.Draw(out).text((i*(w+8)+2,6),lb,fill=(240,240,240))
out = out.resize((out.width*2, out.height*2), Image.NEAREST)
out.save(os.path.join(d,"shots","scratch_cmp3.png"))
print(out.size)
