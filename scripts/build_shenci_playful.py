"""Original light pizzicato loop (no samples), used only by Shen Ci's comic beats."""
from pathlib import Path
import math, struct, subprocess, json, re
ROOT=Path(__file__).resolve().parents[1]; RATE=44100; BPM=112; BEAT=60/BPM; BARS=28; N=round(BARS*4*BEAT*RATE)
def main():
    from array import array
    l=array('f',[0])*N;r=array('f',[0])*N
    def note(t,midi,duration,gain,pan,bass=False):
        start=round(t*BEAT*RATE);f=440*2**((midi-69)/12); count=int(duration*BEAT*RATE)
        for j in range(count):
            x=j/RATE; end=(count-j)/RATE
            env=min(1,x/.011,end/.045)*math.exp(-x*(4.7 if bass else 8.5))
            phase=2*math.pi*f*x
            y=env*gain*(math.sin(phase)+(.22 if bass else .38)*math.sin(phase*2)+.13*math.sin(phase*3)+.045*math.sin(phase*4))
            i=(start+j)%N;l[i]+=y*(1-pan);r[i]+=y*pan
    chords=[(48,55,64,67,72),(45,52,60,64,69),(41,48,57,60,65),(43,50,59,62,67)]
    patterns=[[(.5,2),(1.5,3),(2,4),(3.25,3)],[(0,3),(.75,2),(1.75,2),(2.75,4)],[(.5,2),(1.25,3),(2.5,4)],[(0,3),(1.5,2),(2.25,3),(3,2)]]
    for b in range(BARS):
        c=chords[b%4];t=b*4
        note(t,c[0],.75,.24,.43,True);note(t+2,c[1],.60,.14,.45,True)
        for j,(when,k) in enumerate(patterns[(b+(b//4)%2)%4]):
            note(t+when,c[k]+(12 if b%8==5 and j==1 else 0),.56,.17 if j==0 else .115,.62 if j%2==0 else .35)
        if b%4 in (0,2): note(t+3.54,c[2]-12,.36,.09,.30)
    raw=bytearray(N*4)
    for i,(a,b) in enumerate(zip(l,r)):struct.pack_into('<hh',raw,i*4,int(max(-1,min(1,a))*32767),int(max(-1,min(1,b))*32767))
    args=['ffmpeg','-hide_banner','-f','s16le','-ac','2','-ar',str(RATE),'-i','pipe:0']
    detector=['-af','loudnorm=I=-18:LRA=7:TP=-2:print_format=json','-f','null','-']
    def measured(result):return json.loads(re.findall(r'\{[^{}]+\}',result.stderr.decode(errors='replace'))[-1])
    stats=measured(subprocess.run(args+detector,input=raw,capture_output=True,check=True))
    file=ROOT/'public/audio/music-shenci-playful.mp3'
    norm='loudnorm=I=-18:LRA=7:TP=-2:linear=true'+''.join(f':measured_{k}={stats["input_"+k.lower()]}' for k in ('I','LRA','TP','thresh'))+f':offset={stats["target_offset"]}'
    subprocess.run(args+['-y','-loglevel','error','-af',norm,'-ar',str(RATE),'-b:a','192k',str(file)],input=raw,check=True)
    got=measured(subprocess.run(['ffmpeg','-hide_banner','-i',str(file)]+detector,capture_output=True,check=True)); print(got)
    def add(p,wrap,item):
        d=json.loads(p.read_text(encoding='utf-8')); a=d[wrap] if wrap else d; a[:]=[x for x in a if x.get('file')!=item['file']]+[item];p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    title='街角的小岔子';duration=N/RATE
    add(ROOT/'src/data/soundtrack.json',None,dict(id='shenci-playful',title=title,subtitle='轻拨弦与错拍：给玩笑留半拍',bpm=BPM,keyscale='C major',file=file.name,seconds=duration))
    add(ROOT/'public/audio/manifest.json','files',dict(file=file.name,title=title,kind='music',loop=True,seconds=duration,bytes=file.stat().st_size,integratedLUFS=float(got['input_i']),truePeakDB=float(got['input_tp']),source='Original procedural plucked-string synthesis by scripts/build_shenci_playful.py; no samples'))
if __name__=='__main__':main()
