
import sys, os
from PIL import Image, ImageDraw, ImageStat
d = sys.argv[1]
box = (520, 260, 900, 640)
a = Image.open(os.path.join(d,"shots","grain_default_final.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","grain_60less.png")).convert("RGB")
for n,im in [("0.045",a),("0.018",b)]:
    print(n, [round(v,2) for v in ImageStat.Stat(im).stddev])
ca, cb = a.crop(box), b.crop(box)
w,h = ca.size
out = Image.new("RGB",(w*2+10,h+22),(10,10,10))
out.paste(ca,(0,22)); out.paste(cb,(w+10,22))
dr = ImageDraw.Draw(out)
dr.text((6,6),"grain 0.045",fill=(240,240,240)); dr.text((w+16,6),"grain 0.018  (-60%)",fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_60less_cmp.png"))
print("ok")
