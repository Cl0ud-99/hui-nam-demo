
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
pairs = [("03_shop_in.png","fix_shop2.png","shop"),("07_bath.png","fix_bath6.png","bath")]
for a,b,tag in pairs:
    A = Image.open(os.path.join(d,"shots","main_2026_11_06",a)).convert("RGB")
    B = Image.open(os.path.join(d,"shots",b)).convert("RGB")
    w,h = A.size; sx=0.5; aw,ah=int(w*sx),int(h*sx)
    A=A.resize((aw,ah),Image.LANCZOS); B=B.resize((aw,ah),Image.LANCZOS)
    out=Image.new("RGB",(aw, ah*2+30),(12,12,12))
    out.paste(A,(0,18)); out.paste(B,(0,ah+30))
    dr=ImageDraw.Draw(out); dr.text((6,4),"BEFORE",fill=(235,235,235)); dr.text((6,ah+20),"AFTER",fill=(235,235,235))
    out.save(os.path.join(d,"shots","cmp_"+tag+".jpg"),quality=88)
    print("ok", tag, out.size)
