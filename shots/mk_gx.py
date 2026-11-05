
import sys, os
from PIL import Image, ImageChops, ImageStat, ImageDraw
d = sys.argv[1]
def load(n): return Image.open(os.path.join(d,"shots",n)).convert("RGB")
a, b = load("g_test_0.png"), load("g_test_5.png")
diff = ImageChops.difference(a,b)
st = ImageStat.Stat(diff); h = diff.convert("L").histogram(); tot=sum(h)
print("grain 0 vs 0.5 -> diff mean", [round(v,2) for v in st.mean], "pct>6 %.1f%%" % (sum(h[7:])*100/tot))
box=(520,260,900,640)
out = Image.new("RGB",(760,402),(10,10,10))
out.paste(a.crop(box),(0,22)); out.paste(b.crop(box),(390,22))
dr = ImageDraw.Draw(out); dr.text((6,6),"grain 0",fill=(240,240,240)); dr.text((396,6),"grain 0.5",fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_extreme.png"))
print("ok")
