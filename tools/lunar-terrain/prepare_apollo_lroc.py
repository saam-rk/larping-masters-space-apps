"""Prepare a continuous residual-refined mesh from official LROC Apollo 11 DTM."""
from pathlib import Path
import hashlib
import json
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import Transformer
from scipy.spatial import Delaunay
from scipy.interpolate import LinearNDInterpolator
from scipy.ndimage import map_coordinates
from PIL import Image, ImageDraw
from shackleton_textures import bake

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/terrain/apollo-11'
SOURCE=OUT/'source/lroc'
LAT,LON=.67416,23.47314
with rasterio.open(SOURCE/'DTM.TIF') as ds:
    projection=Transformer.from_crs(ds.crs.geodetic_crs,ds.crs,always_xy=True)
    x0,y0=projection.transform(LON,LAT)
    row,col=ds.index(x0,y0)
    window=Window(col-450,row-450,901,901)
    affine=ds.window_transform(window)
    full_affine=ds.transform
    elevation=ds.read(1,window=window,masked=True)
    assert not np.ma.getmaskarray(elevation).any()
    elevation=np.asarray(elevation)
    crs=ds.crs.to_wkt()
    profile=ds.profile.copy()
    profile.update(width=901,height=901,transform=affine)
    with rasterio.open(SOURCE/'dtm-crop.tif','w',**profile) as crop:
        crop.write(elevation,1)
with rasterio.open(SOURCE/'CONF.IMG') as ds:
    assert np.allclose(tuple(ds.transform),tuple(full_affine))
    confidence=ds.read(1,window=window)
with rasterio.open(SOURCE/'ORTHO.TIF') as ds:
    assert np.allclose(tuple(ds.transform),tuple(full_affine))
    ortho=ds.read(1,window=window)
np.savez_compressed(SOURCE/'reference-crop.npz',confidence=confidence,ortho=ortho)
def sample(xy):
    cols=(xy[:,0]+x0-affine.c)/affine.a-.5
    rows=(xy[:,1]+y0-affine.f)/affine.e-.5
    assert min(rows.min(),cols.min())>=0 and max(rows.max(),cols.max())<900
    return map_coordinates(elevation.astype(float),[rows,cols],order=1)

# Dense near-field source sampling and background refinement by actual residual.
axis=np.linspace(-800,800,135)
x,y=np.meshgrid(axis,axis)
xy=np.column_stack((x.ravel(),y.ravel()))
near=np.arange(-100,102,2.)
x,y=np.meshgrid(near,near)
xy=np.unique(np.vstack((xy,np.column_stack((x.ravel(),y.ravel())))),axis=0)
gx=(np.arange(901)+.5)*2+affine.c-x0
gy=affine.f-(np.arange(901)+.5)*2-y0
x,y=np.meshgrid(gx,gy)
inside=(np.abs(x)<800)&(np.abs(y)<800)
candidates=np.column_stack((x[inside],y[inside]))
truth=elevation[inside].astype(float)
for iteration in range(12):
    tri=Delaunay(xy)
    residual=np.abs(LinearNDInterpolator(tri,sample(xy))(candidates)-truth)
    remaining=40500-len(xy)
    if remaining<=0: break
    order=np.argsort(residual)[::-1]
    cells=np.floor((candidates[order]+800)/8).astype(int)
    _,first=np.unique(cells[:,0]*201+cells[:,1],return_index=True)
    chosen=order[np.sort(first)][:min(remaining,3000)]
    xy=np.unique(np.vstack((xy,candidates[chosen])),axis=0)
    print('refinement',iteration,len(xy),'max residual',float(np.nanmax(residual)),flush=True)
assert len(xy)==40500
tri=Delaunay(xy)
h0=float(sample(np.array([[0.,0.]]))[0])
vertices=np.column_stack((xy,sample(xy)-h0))
np.savez(OUT/'mesh-input.npz',vertices=vertices,faces=tri.simplices)
residual=np.abs(LinearNDInterpolator(tri,sample(xy))(candidates)-truth)
values,counts=np.unique(confidence[inside],return_counts=True)
meta=dict(id='apollo-11',latitudeDeg=LAT,longitudeEastDeg=LON,
    frame='LRO lunar planetocentric / Mean Earth convention; catalogue anchor ME/DE421',
    radiusM=1737400.,originElevationM=h0,originProjectedM=[x0,y0],crsWkt=crs,
    axes={'blender':'+X east, +Y north, +Z radial height','glb':'+X east, +Y radial height, -Z north'},
    transform='Project lon/lat with supplied CRS (standard parallel 1 deg, central meridian 180 deg); subtract originProjectedM; GLB=(dx,elevation-h0,-dy)',
    verticalExaggeration=1,curvatureCorrection=False,sourceProduct='NAC_DTM_APOLLO11 v1.9',
    sourceUrl='https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/SDP/NAC_DTM/APOLLO11/NAC_DTM_APOLLO11.TIF',
    retrievalDate='2026-11-15',sampleSpacingM=2.,coverageLocalM=[-800,-800,800,800],
    sourceFiles={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in SOURCE.iterdir() if p.suffix in ['.TIF','.IMG','.LBL','.TXT']},
    coordinateSource='https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
    confidenceCounts={str(int(v)):int(c) for v,c in zip(values,counts)},
    relativePrecisionReportedM=.77,lolaFitRmsReportedM=1.81,
    rasterToMeshErrorM={'max':float(residual.max()),'p95':float(np.percentile(residual,95)),'rms':float(np.sqrt(np.mean(residual**2)))},
    vertices=len(vertices),triangles=len(tri.simplices),
    limitations=['2 m stereo DTM is not centimetre-scale measured relief.',
        'Confidence class 3 pixels are retained but flagged as suspicious, not corrected or claimed reliable.',
        'No geographic imagery used as material; orthophoto is validation evidence only.',
        'Illustrative micrograin and lighting, no invented boulders or craters.',
        'No curvature correction, no visibility or landing-suitability guarantee.'])
(OUT/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n')
bake(OUT)
with Image.open(OUT/'regolith-orm.png') as image:
    image.resize((128,128),Image.Resampling.LANCZOS).save(OUT/'regolith-orm.png')

# Aligned evidence sheet; imagery is never used as albedo (it contains shadows).
dy,dx=np.gradient(elevation,2)
shade=np.clip((.8-dx*.5+dy*.3)/np.sqrt(1+dx*dx+dy*dy),0,1)
panels=[Image.fromarray(ortho).convert('RGB'),Image.fromarray((shade*255).astype('uint8')).convert('RGB')]
for panel in panels:
    draw=ImageDraw.Draw(panel)
    for label,ex,ny in [('LM anchor',0,0),('Little West search',60,0),('West search',500,-100)]:
        u=(ex+x0-affine.c)/2; v=(affine.f-ny-y0)/2
        draw.ellipse((u-5,v-5,u+5,v+5),outline='red',width=2)
        draw.text((u+7,v+5),label,fill='red')
sheet=Image.new('RGB',(1802,925),'black')
sheet.paste(panels[0],(0,24));sheet.paste(panels[1],(901,24))
draw=ImageDraw.Draw(sheet)
draw.text((10,5),'LROC orthophoto M150361817 / north up / 2 m per pixel',fill='white')
draw.text((911,5),'LROC DTM shaded relief / same projection and extent',fill='white')
sheet.save(OUT/'source-comparison.png')
print(json.dumps({'vertices':len(xy),'triangles':len(tri.simplices),'height':h0,'error':meta['rasterToMeshErrorM'],'confidence':meta['confidenceCounts']},indent=2))
