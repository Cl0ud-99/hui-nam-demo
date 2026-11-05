
import sys, os, statistics
from PIL import Image, ImageChops
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","sc4_0.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","sc4_1.png")).convert("RGB")
diff = ImageChops.difference(a,b).convert("L"); px=diff.load(); W,H=diff.size
cols=[sum(px[x,y] for y in range(100,860,4))/190.0 for x in range(W)]
best=None
for x in range(40,W-40):
    base=statistics.median(cols[x-40:x+40]); s=cols[x]-base
    if best is None or s>best[1]: best=(x,s,cols[x],base)
print("默认强度 最強豎線 x=%d 平均增幅=%.2f/255  峰值列均值=%.1f (背景 %.1f)" % (best[0], best[1], best[2], best[3]))
print("橫向剖面:", [(x, round(cols[x],1)) for x in range(best[0]-4, best[0]+5)])
