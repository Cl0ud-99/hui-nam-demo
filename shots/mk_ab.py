
import sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageStat
d = sys.argv[1]
box = (520, 260, 900, 640)
a = Image.open(os.path.join(d,"shots","grain_ref045.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","grain_60less.png")).convert("RGB")
# 高频能量：原图 - 高斯模糊，用来量化颗粒
def hf(im):
    g = im.convert("L").filter(ImageFilter.GaussianBlur(1.2))
    diff = ImageStat.Stat(__import__("PIL.ImageChops", fromlist=["ImageChops"]).difference(im.convert("L"), g))
    return round(sum(diff.mean)/3, 3)
print("HF energy 0.045 =", hf(a), " | 0.018 =", hf(b), " | ratio", round(hf(b)/hf(a),3))
ca, cb = a.crop(box), b.crop(box)
w,h = ca.size
out = Image.new("RGB",(w*2+10,h+22),(10,10,10))
out.paste(ca,(0,22)); out.paste(cb,(w+10,22))
dr = ImageDraw.Draw(out)
dr.text((6,6),"grain 0.045 (same build, ?grain=0.045)",fill=(240,240,240))
dr.text((w+16,6),"grain 0.018 (new default, -60%)",fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_ab.png"))
print("ok")
