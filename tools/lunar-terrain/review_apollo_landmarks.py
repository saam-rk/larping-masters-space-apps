"""Measure identifiable crater neighborhoods without fitting invented geometry."""
from pathlib import Path
import json
import numpy as np
import rasterio
from PIL import Image, ImageDraw

out=Path(__file__).resolve().parents[2]/'assets/terrain/apollo-11'
meta=json.loads((out/'metadata.json').read_text())
x0,y0=meta['originProjectedM']
with rasterio.open(out/'source/lroc/dtm-crop.tif') as ds:
    h=ds.read(1); a=ds.transform
x=(np.arange(h.shape[1])+.5)*a.a+a.c-x0
y=(np.arange(h.shape[0])+.5)*a.e+a.f-y0
xx,yy=np.meshgrid(x,y)
ref=np.load(out/'source/lroc/reference-crop.npz')
report=[]
for name,bounds in [('Little West',(40,-25,90,25)),('West',(450,-180,600,-40))]:
    xmin,ymin,xmax,ymax=bounds
    mask=(xx>=xmin)&(xx<=xmax)&(yy>=ymin)&(yy<=ymax)
    indices=np.argwhere(mask)
    row,col=indices[np.argmin(h[mask])]
    values,counts=np.unique(ref['confidence'][mask],return_counts=True)
    report.append({'name':name,'searchBoundsLocalM':bounds,
        'lowestDtmSampleLocalM':[float(xx[row,col]),float(yy[row,col])],
        'lowestElevationM':float(h[row,col]),'neighborhoodReliefM':float(np.ptp(h[mask])),
        'confidenceCounts':{str(int(v)):int(c) for v,c in zip(values,counts)},
        'interpretation':'Position and outline visually cross-checked against co-projected orthophoto; minimum is not a surveyed crater center.'})
# Detailed nearby comparison at identical pixel locations, enlarged for inspection.
maskx=(x>=-40)&(x<=120); masky=(y>=-70)&(y<=70)
rows=np.where(masky)[0]; cols=np.where(maskx)[0]
z=h[rows[0]:rows[-1]+1,cols[0]:cols[-1]+1]
o=ref['ortho'][rows[0]:rows[-1]+1,cols[0]:cols[-1]+1]
dy,dx=np.gradient(z,2)
shade=np.clip((.65-dx*.6+dy*.2)/np.sqrt(1+dx*dx+dy*dy),0,1)
panels=[Image.fromarray(o).convert('RGB'),Image.fromarray((shade*255).astype('uint8')).convert('RGB')]
canvas=Image.new('RGB',(1280,600),'black')
for i,panel in enumerate(panels):
    panel=panel.resize((640,560))
    canvas.paste(panel,(640*i,40))
draw=ImageDraw.Draw(canvas)
draw.text((10,10),'Official 2 m orthophoto: LM neighborhood and Little West',fill='white')
draw.text((650,10),'Same area: DTM-derived shading, no invented relief',fill='white')
canvas.save(out/'little-west-comparison.png')
(out/'landmarks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
