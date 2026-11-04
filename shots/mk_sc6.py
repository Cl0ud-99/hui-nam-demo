
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
a = Image.open(os.path.join(d,"shots","sc4_0.png")).convert("RGB")
b = Image.open(os.path.join(d,"shots","sc4_1.png")).convert("RGB")
box = (660, 150, 760, 830)
crops = [a.crop(box), b.crop(box)]
w,h = crops[0].size
out = Image.new("RGB",(w*2+10,h+20),(10,10,10))
out.paste(crops[0],(0,20)); out.paste(crops[1],(w+10,20))
dr=ImageDraw.Draw(out); dr.text((4,4),"no scratch",fill=(240,240,240)); dr.text((w+14,4),"scratch (default)",fill=(240,240,240))
out=out.resize((out.width*3,out.height*3), Image.LANCZOS)
out.save(os.path.join(d,"shots","scratch_final.png"))
print(out.size)
