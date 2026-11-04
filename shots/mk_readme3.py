
import sys, os, shutil
from PIL import Image, ImageDraw
d = sys.argv[1]
src = os.path.join(d, "shots", "readme2")
shutil.copy(os.path.join(d,"shots","cand_shop_a.png"), os.path.join(src,"03_shop_in.png"))
shutil.copy(os.path.join(d,"shots","cand_bath_b.png"), os.path.join(src,"07_bath.png"))
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
print("total %.2f MB" % (total/1048576))
th=[]
for a,_ in pairs:
    im = Image.open(os.path.join(src, a + ".png")).convert("RGB").resize((640,360), Image.LANCZOS)
    th.append(im)
out = Image.new("RGB",(640*2+8, 360*4+12),(12,12,12))
for i,t in enumerate(th):
    out.paste(t, ((i%2)*648, (i//2)*366))
out.save(os.path.join(d,"shots","readme2_grid.jpg"), quality=88)
print("ok")
