
import sys, os
from PIL import Image, ImageChops, ImageStat, ImageFilter, ImageDraw
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","g115_0.018.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","g115_0.0207.png")).convert("RGB")
def hf(im):
    g = im.convert("L").filter(ImageFilter.GaussianBlur(1.2))
    return sum(ImageStat.Stat(ImageChops.difference(im.convert("L"), g)).mean)/3
ha, hb = hf(a), hf(b)
# 去掉"场景自身"基线：用 grain=0 作参考
base = Image.open(os.path.join(d,"shots","gv_0.png")).convert("RGB")
hj = hf(base)
print("HF base(0)=%.3f  0.018=%.3f  0.0207=%.3f" % (hj, ha, hb))
print("grain 贡献: 0.018 -> %.3f, 0.0207 -> %.3f, 比值 %.3f (目标 1.15)" % (ha-hj, hb-hj, (hb-hj)/(ha-hj)))
diff = ImageChops.difference(a,b); h=diff.convert("L").histogram(); tot=sum(h)
print("两版差异 mean=%s pct>2=%.1f%%" % ([round(v,2) for v in ImageStat.Stat(diff).mean], sum(h[3:])*100/tot))
box=(520,260,900,640)
out=Image.new("RGB",(770,402),(10,10,10))
out.paste(a.crop(box),(0,22)); out.paste(b.crop(box),(390,22))
dr=ImageDraw.Draw(out); dr.text((6,6),"grain 0.018",fill=(240,240,240)); dr.text((396,6),"grain 0.0207 (+15%)",fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_15more.png"))
print("ok")
