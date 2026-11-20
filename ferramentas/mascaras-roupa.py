# Gera, para cada pessoa Rocketbox, uma máscara da roupa (branco = roupa, preto = pele) a partir da
# textura do corpo, para o editor de personagem poder mudar a cor da roupa sem mexer na pele.
# Uso: python ferramentas/mascaras-roupa.py  (precisa de Pillow)
import glob, os
from PIL import Image, ImageFilter


def roupa(p):
    r, g, b = p
    mx, mn = max(p), min(p)
    if mx < 6:
        return 0  # fundo da textura
    sat = (mx - mn) / mx
    pele = r > 115 and r > g > b and r - g > 20 and r - b > 38 and 0.15 < sat < 0.62 and g > 76
    return 0 if pele else 255


for d in sorted(glob.glob('public/modelos/pessoas/*/corpo_cor.jpg')):
    im = Image.open(d).convert('RGB').resize((512, 512))
    m = Image.new('L', im.size)
    m.putdata([roupa(p) for p in im.getdata()])
    m = m.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    destino = os.path.join(os.path.dirname(d), 'roupa_mascara.png')
    m.save(destino, optimize=True)
    print(destino)
