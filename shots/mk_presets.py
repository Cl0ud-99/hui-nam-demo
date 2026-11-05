
import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
names = [("0","AGED 0.00  (off)"),("0.35","AGED 0.35  (mild)"),("0.6","AGED 0.60  (default)"),("0.85","AGED 0.85  (heavy)")]
imgs = [(Image.open(os.path.join(d,"preset_%s.png"%a)).convert("RGB"), t) for a,t in names]
w,h = imgs[0][0].size
sx = 0.5
aw, ah = int(w*sx), int(h*sx)
out = Image.new("RGB", (aw*2+8, ah*2+8), (10,10,10))
dr = ImageDraw.Draw(out)
for i,(im,t) in enumerate(imgs):
    x = (i%2)*(aw+8); y = (i//2)*(ah+8)
    out.paste(im.resize((aw,ah), Image.LANCZOS), (x,y))
    dr.text((x+10, y+8), t, fill=(235,235,235))
out.save(os.path.join(d,"../shots/grade_presets.jpg"), quality=88)
print("ok", out.size)
