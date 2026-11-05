
import sys, os
from PIL import Image
d = sys.argv[1]
src = os.path.join(d, "shots", "readme")
dst = os.path.join(d, "docs", "screens")
os.makedirs(dst, exist_ok=True)
pairs = [("00_menu","menu"),("02_shopfront","shopfront"),("03_shop_in","shop_interior"),
         ("04_stairs","stairs"),("06_altar","altar"),("07_bath","bath"),("08_pv","trailer")]
for a, b in pairs:
    im = Image.open(os.path.join(src, a + ".png")).convert("RGB")
    w, h = im.size
    nw = 1440
    im = im.resize((nw, round(h * nw / w)), Image.LANCZOS)
    out = os.path.join(dst, b + ".jpg")
    im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    print("%-16s %dx%d %6.1f KB" % (b, im.size[0], im.size[1], os.path.getsize(out)/1024))
