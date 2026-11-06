
import sys, os
from PIL import Image
d = sys.argv[1]
im = Image.open(os.path.join(d,"shots","tap_a.png")).convert("RGB")
w,h = im.size
# 龙头在画面中下部：裁剪并放大
box = (int(w*0.36), int(h*0.66), int(w*0.60), int(h*0.92))
crop = im.crop(box).resize((int((box[2]-box[0])*2.2), int((box[3]-box[1])*2.2)), Image.LANCZOS)
crop.save(os.path.join(d,"shots","tap_a_zoom.png"))
im2 = Image.open(os.path.join(d,"shots","tap_b.png")).convert("RGB")
box2 = (int(w*0.40), int(h*0.60), int(w*0.68), int(h*0.92))
crop2 = im2.crop(box2).resize((int((box2[2]-box2[0])*2.0), int((box2[3]-box2[1])*2.0)), Image.LANCZOS)
crop2.save(os.path.join(d,"shots","tap_b_zoom.png"))
print("ok", crop.size, crop2.size)
