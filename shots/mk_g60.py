
import sys, os
from PIL import Image, ImageChops, ImageStat, ImageDraw, ImageFilter
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","g60_0.045.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","g60_0.018.png")).convert("RGB")
def hf(im):
    g = im.convert("L").filter(ImageFilter.GaussianBlur(1.2))
    return round(sum(ImageStat.Stat(ImageChops.difference(im.convert("L"), g)).mean)/3, 3)
print("HF 0.045 =", hf(a), " | HF 0.018 =", hf(b), " | ratio", round(hf(b)/hf(a),3))
diff = ImageChops.difference(a,b); h=diff.convert("L").histogram(); tot=sum(h)
print("diff mean", [round(v,2) for v in ImageStat.Stat(diff).mean], "pct>4 %.1f%%" % (sum(h[5:])*100/tot))
box=(520,260,900,640)
out = Image.new("RGB",(770,402),(10,10,10))
out.paste(a.crop(box),(0,22)); out.paste(b.crop(box),(390,22))
dr=ImageDraw.Draw(out); dr.text((6,6),"grain 0.045 (before)",fill=(240,240,240)); dr.text((396,6),"grain 0.018 (-60%)",fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_60_ab.png"))
print("ok")
