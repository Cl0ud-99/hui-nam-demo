
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
src = os.path.join(d, "shots", "readme2")
dst = os.path.join(d, "docs", "screens")
pairs = [("00_menu","menu"),("02_shopfront","shopfront"),("03_shop_in","shop_interior"),
         ("04_stairs","stairs"),("06_altar","altar"),("07_bath","bath"),("08_pv","trailer")]
total = 0
for a, b in pairs:
    im = Image.open(os.path.join(src, a + ".png")).convert("RGB")
    w, h = im.size
    im = im.resize((1440, round(h * 1440 / w)), Image.LANCZOS)
    out = os.path.join(dst, b + ".jpg")
    im.save(out, "JPEG", quality=86, optimize=True, progressive=True)
    total += os.path.getsize(out)
    print("%-15s %6.1f KB" % (b, os.path.getsize(out)/1024))
print("total %.2f MB" % (total/1048576))
# 审阅用拼图
thumbs = []
for a,_ in pairs:
    im = Image.open(os.path.join(src, a + ".png")).convert("RGB")
    im = im.resize((640, 360), Image.LANCZOS)
    thumbs.append(im)
out = Image.new("RGB", (640*2+8, 360*4+12), (12,12,12))
for i,t in enumerate(thumbs[:7]):
    out.paste(t, ((i%2)*(648), (i//2)*(366)))
out.save(os.path.join(d,"shots","readme2_grid.jpg"), quality=88)
print("grid ok")
