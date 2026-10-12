#!/usr/bin/env python3
"""Wave24 ORIGINAL game texture generator. 2D ChatGPT artwork is visual design
reference only; generated pixels are fresh, procedural, license-free material
patterns (no image copy/paste, no third-party image model). GLB textures 1024px.
Usage: python3 scripts/wave24-textures.py weapon
       python3 scripts/wave24-textures.py gear german '<JSON material palette>'
"""
import json,sys,struct,zlib,math
from pathlib import Path
import numpy as np
ROOT=Path("three-d/assets")
def png(path,arr):
    arr=np.asarray(arr,dtype=np.uint8)
    h,w,channels=arr.shape;assert channels==4
    def chunk(tag,b):return struct.pack(">I",len(b))+tag+b+struct.pack(">I",zlib.crc32(tag+b)&0xffffffff)
    raw=b''.join(b'\0'+arr[y].tobytes() for y in range(h))
    payload=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,6))+chunk(b'IEND',b'')
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(payload)
    print("WAVE24_TEXTURE",path,"pixels",w,h,"bytes",len(payload))
def swatch(style,base,w,h,seed):
    rng=np.random.default_rng(seed)
    y,x=np.mgrid[0:h,0:w].astype(np.float32)
    noise=rng.normal(size=(h,w)).astype(np.float32)
    if style=="metal":
        # directional machined/blued steel, fine scuffs and patina
        grain=np.sin(y*.87+np.sin(x*.046)*2)*.045+np.sin(y*3.14)*.018
        gouge=np.where(rng.random((h,w))>.9992,.33,0)
        flecks=np.where(rng.random((h,w))>.989,-.23,0)
        bands=np.sin(x*.031+y*.009)*.06
        delta=grain+bands+noise*.065+gouge+flecks
    elif style=="phosphate":
        flecks=np.where(rng.random((h,w))>.991,.22,0)
        grain=np.sin(x*.35)*.016+np.sin(y*.22)*.013
        delta=noise*.075+grain+flecks
    elif style=="wood":
        # distinguishable WWII reddish walnut figure with long ribbon grain
        large=np.sin(x*.06+2.8*np.sin(y*.022)+.45*np.sin(x*.21))* .17
        small=np.sin(x*.34+np.sin(y*.032)*3.6)*.048
        knots=np.sin(np.sqrt((x-w*.58)**2+(y-h*.40)**2)*.08)*.040
        delta=large+small+knots+noise*.028
    elif style=="bakelite":
        delta=np.sin(y*.17)*.035+np.sin(x*.07)*.025+noise*.033
    elif style=="canvas":
        woven=(np.sin(x*math.pi*.92)*.066+np.sin(y*math.pi*.85)*.056)
        fold=np.sin(y*.054+np.sin(x*.039))* .095
        delta=woven+fold+noise*.036
    elif style=="leather":
        delta=np.sin(y*.021+x*.017)*.085+noise*.09+np.where(rng.random((h,w))>.993,.19,0)
    elif style=="wool":
        weave=np.sin(x*math.pi*.63+y*.05)*np.sin(y*math.pi*.61-x*.04)*.07
        fold=np.sin(x*.053+y*.019)*.07
        delta=weave+fold+noise*.035
    else:
        delta=noise*.025
    colors=np.broadcast_to(np.array(base,dtype=np.float32)[None,None,:],(h,w,3)).copy()
    warm=np.array([1.05,1.0,.96],np.float32) if style in ("leather","wood") else np.ones(3,np.float32)
    out=(colors+delta[:,:,None])*warm
    return np.clip(out*255,0,255).astype(np.uint8)
def main():
    if len(sys.argv)<2:raise SystemExit("Need weapon or gear")
    kind=sys.argv[1]
    if kind=="weapon":
        size=256;out=np.full((size,4*size,4),255,np.uint8)
        materials=[
          ("blued-steel","metal",(.28,.30,.30)),
          ("phosphate-steel","phosphate",(.18,.21,.20)),
          ("brown-bakelite","bakelite",(.28,.17,.12)),
          ("walnut-stock","wood",(.40,.215,.112))]
        for i,(label,style,col) in enumerate(materials):
            out[:size,i*size:(i+1)*size,:3]=swatch(style,col,size,size,811+i)
        png(ROOT/"weapons/wave24_material_atlas.png",out)
        (ROOT/"weapons/wave24_material_audit.json").write_text(json.dumps({
          "creator":"OpenAI-directed local procedural original; ChatGPT 2D asset sheet served only as visual reference",
          "tiles": [{"name":a,"category":b,"index":i} for i,(a,b,c) in enumerate(materials)],
          "resolution":[1024,256],"doNotMisrepresentAs":"literal ChatGPT image pixels or photogrammetric PBR scan"},indent=2))
        return
    if kind=="gear":
        team=sys.argv[2];materials=json.loads(sys.argv[3])
        assert len(materials)<=64
        h=w=1024;size=128;arr=np.zeros((h,w,4),np.uint8);arr[:,:,3]=255
        for i,m in enumerate(materials):
            name=m["name"].lower()
            if any(s in name for s in ("steel","metal","brushed","tin","helmet","mag")):style="metal"
            elif "leather" in name:style="leather"
            elif any(s in name for s in ("wool","uniform","gymnastiorka")):style="wool"
            else:style="canvas"
            col=np.clip(m["rgb"],.03,.88)
            x=(i%8)*size;y=(i//8)*size
            arr[y:y+size,x:x+size,:3]=swatch(style,col,size,size,1811+i*13+(team=="soviet")*731)
        png(ROOT/f"characters/wave24_gear_atlas_{team}.png",arr)
        (ROOT/f"characters/wave24_gear_atlas_{team}.json").write_text(json.dumps({
            "creator":"Original procedural weaving & material wear driven by ChatGPT 2D WWII concept art",
            "source":"Original Wave23 CC0 licensed rig; newly authored textures and equipment",
            "tileSize":128,"roles":3,"materials":materials},indent=2))
        return
    raise SystemExit("unsupported mode")
if __name__=="__main__":main()
