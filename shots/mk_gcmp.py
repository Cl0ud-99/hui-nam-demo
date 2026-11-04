
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
box = (520, 260, 900, 640)
old = Image.open(os.path.join(d,"shots","pass5","06_altar.png")).convert("RGB").crop(box)
new = Image.open(os.path.join(d,"shots","grain_test.png")).convert("RGB").crop(box)
w,h = old.size
out = Image.new("RGB",(w*2+10, h+22),(10,10,10))
out.paste(old,(0,22)); out.paste(new,(w+10,22))
dr = ImageDraw.Draw(out)
dr.text((6,6),"BEFORE  (CSS 180px tile + old hash)",fill=(240,240,240))
dr.text((w+16,6),"AFTER  (no tile, per-frame hash)",fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_compare.png"))
print(out.size)
