
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
im = Image.open(os.path.join(d,"shots","sc_default.png")).convert("RGB")
crop = im.crop((640, 120, 780, 860))
crop = crop.resize((crop.width*2, crop.height*2), Image.LANCZOS)
crop.save(os.path.join(d,"shots","scr_final_crop.png"))
print(crop.size)
