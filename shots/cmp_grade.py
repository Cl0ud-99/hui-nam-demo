
import sys, os
from PIL import Image, ImageStat
d = sys.argv[1]
for n in ["pass5/02_shopfront.png", "grade_after_1.png", "grade_after_2.png"]:
    im = Image.open(os.path.join(d, n)).convert("RGB")
    st = ImageStat.Stat(im)
    print("%-26s mean=%s std=%s" % (n, [round(v) for v in st.mean], [round(v) for v in st.stddev]))
