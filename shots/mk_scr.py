
import sys, os
from PIL import Image, ImageChops, ImageStat, ImageDraw
d = sys.argv[1]
names = ["scr_13.3.png","scr_12.07.png","scr_14.57.png"]
ims = [Image.open(os.path.join(d,"shots",n)).convert("RGB") for n in names]
# 与"无划痕"帧做差，找竖线
base = ims[0]
for n, im in zip(names, ims):
    diff = ImageChops.difference(base, im).convert("L")
    colmean = [sum(diff.crop((x,0,x+1,900)).getdata())/900 for x in range(0,1600,2)]
    peak = max(colmean); px = colmean.index(peak)*2
    print("%-14s 最强竖列 x=%4d  强度=%.2f" % (n, px, peak))
# 拼一条竖线区域的放大对比（x 附近 120px 宽）
out = Image.new("RGB",(3*200, 900),(0,0,0))
for i,im in enumerate(ims):
    out.paste(im.crop((700,0,900,900)),(i*200,0))
out.save(os.path.join(d,"shots","scratch_cmp.png"))
print("ok")
