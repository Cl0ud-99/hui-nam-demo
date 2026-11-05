
import sys, os
from PIL import Image, ImageChops, ImageStat
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","grain_ref045.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","grain_60less.png")).convert("RGB")
print("same size", a.size == b.size)
diff = ImageChops.difference(a,b)
st = ImageStat.Stat(diff)
print("diff mean", [round(v,3) for v in st.mean], "bbox", diff.getbbox())
h = diff.convert("L").histogram(); tot=sum(h)
print("pct>2 = %.2f%%  pct>6 = %.2f%%" % (sum(h[3:])*100/tot, sum(h[7:])*100/tot))
