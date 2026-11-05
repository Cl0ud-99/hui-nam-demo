
import sys, os
from PIL import Image
d = sys.argv[1]
im = Image.open(os.path.join(d, "shots", "grain_test.png")).convert("RGB")
# 100% 裁切：挑一块比较平的墙面/暗部
crops = [(520, 260, 900, 640), (980, 380, 1360, 760)]
for i,(x0,y0,x1,y1) in enumerate(crops):
    im.crop((x0,y0,x1,y1)).save(os.path.join(d, "shots", "grain_crop_%d.png" % i))
print("ok")
