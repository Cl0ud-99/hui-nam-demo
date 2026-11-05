
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
box = (520, 260, 900, 640)
old = Image.open(os.path.join(d,"shots","pass5","06_altar.png")).convert("RGB").crop(box)
mid = Image.open(os.path.join(d,"shots","grain_test.png")).convert("RGB").crop(box)
new = Image.open(os.path.join(d,"shots","grain_test2.png")).convert("RGB").crop(box)
w,h = old.size
out = Image.new("RGB",(w*3+20, h+22),(10,10,10))
for i,(im,t) in enumerate([(old,"BEFORE tiled"),(mid,"v1 per-pixel"),(new,"v2 soft clumps")]):
    out.paste(im,(i*(w+10),22)); ImageDraw.Draw(out).text((i*(w+10)+6,6),t,fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_compare2.png"))
im2 = Image.open(os.path.join(d,"shots","grain_test2.png")).convert("RGB")
print(out.size, "full mean", [round(v) for v in __import__("PIL.ImageStat",fromlist=["ImageStat"]).Stat(im2).mean])
