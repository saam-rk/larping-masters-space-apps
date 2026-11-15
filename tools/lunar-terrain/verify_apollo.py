"""Independent exported-buffer, image, topology and source-height checks."""
from pathlib import Path
import json
import struct
import io
import numpy as np
import rasterio
from PIL import Image
from scipy.ndimage import map_coordinates
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

root = Path(__file__).resolve().parents[2]
out = root/'assets/terrain/apollo-11'
blob = (root/'public/terrain/apollo-11.glb').read_bytes()
magic, version, length = struct.unpack_from('<III',blob)
assert magic == 0x46546c67 and version == 2 and length == len(blob) <= 2097152
json_length = struct.unpack_from('<I',blob,12)[0]
doc = json.loads(blob[20:20+json_length])
binary = blob[28+json_length:]
def read(index):
    a=doc['accessors'][index]; view=doc['bufferViews'][a['bufferView']]
    dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']]
    width={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
    assert 'byteStride' not in view
    return np.frombuffer(binary,dtype=dtype,count=a['count']*width,
        offset=view.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,width)
assert len(doc['meshes']) == 1
prim=doc['meshes'][0]['primitives'][0]
v=read(prim['attributes']['POSITION']).astype(float)
f=read(prim['indices']).reshape(-1,3)
assert 40000 <= len(v) <= 60000 and 80000 <= len(f) <=120000
assert not doc.get('extensionsRequired')
edges=np.sort(np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]),axis=1)
edges, counts=np.unique(edges,axis=0,return_counts=True)
assert counts.max()==2
graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(v),len(v)))
assert connected_components(graph,directed=False,return_labels=False)==1
boundary=edges[counts==1]
assert len(v)-len(edges)+len(f)==1
_,degrees=np.unique(boundary,return_counts=True)
assert np.all(degrees==2)
assert np.all(np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])[:,1]>0)
meta=json.loads((out/'metadata.json').read_text())
with rasterio.open(out/'source/lroc/dtm-crop.tif') as ds:
    crop=ds.read(1).astype(float)
    affine=ds.transform
x0,y0=meta['originProjectedM']
cols=(v[:,0]+x0-affine.c)/affine.a-.5
rows=(-v[:,2]+y0-affine.f)/affine.e-.5
height=map_coordinates(crop,[rows,cols],order=1)
error=np.max(np.abs(v[:,1]+meta['originElevationM']-height))
assert error<.002
images=[]
for item in doc['images']:
    view=doc['bufferViews'][item['bufferView']]
    start=view.get('byteOffset',0)
    with Image.open(io.BytesIO(binary[start:start+view['byteLength']])) as im:
        im.load(); images.append({'size':list(im.size),'format':im.format})
assert len(images)==3
assert all(s['wrapS']==33071 and s['wrapT']==33071 for s in doc['samplers'])
report={'bytes':len(blob),'vertices':len(v),'triangles':len(f),'connectedComponents':1,
    'boundaryLoops':1,'interiorCracks':0,'degenerateTriangles':0,'maxVertexSourceErrorM':float(error),
    'decodedImages':images,'compression':None,'browserVisualCheck':'pending: integrated browser cannot reach local Vite server'}
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
