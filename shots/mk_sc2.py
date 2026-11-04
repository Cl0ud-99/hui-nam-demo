
import sys, os
from PIL import Image, ImageChops, ImageStat
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","sc2_a0.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","sc2_a1.png")).convert("RGB")
diff = ImageChops.difference(a,b).convert("L")
W,H = diff.size
cols = []
px = diff.load()
for x in range(W):
    s = 0
    for y in range(100, 860, 4):
        s += px[x,y]
    cols.append(s/190.0)
# 找局部尖峰（相对左右 40px 中位数）
import statistics
best = None
for x in range(40, W-40):
    base = statistics.median(cols[x-40:x+40])
    score = cols[x] - base
    if best is None or score > best[1]:
        best = (x, score, cols[x], base)
print("最强竖线: x=%d  col=%.2f  base=%.2f  超出=%.2f" % (best[0], best[2], best[3], best[1]))
print("x=453 附近:", [(x, round(cols[x],2)) for x in range(448, 460)])
