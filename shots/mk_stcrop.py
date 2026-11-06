
import sys, os
from PIL import Image
d = sys.argv[1]
im = Image.open(os.path.join(d,"shots","main_2026_11_06","04_stairs.png")).convert("RGB")
im.crop((0, 520, 800, 900)).save(os.path.join(d,"shots","stairs_crop.png"))
# 找出最亮的像素位置与值
px = im.load(); W,H = im.size
best = []
for y in range(0,H,2):
    for x in range(0,W,2):
        r,g,b = px[x,y]
        if r+g+b > 700: best.append((x,y,r,g,b))
print("pixels >700 sum:", len(best), best[:5])
