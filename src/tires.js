import * as THREE from 'three';

const bodyMaterial=new THREE.MeshStandardMaterial({color:0x282a2d,roughness:.94});
const treadMaterials={
  rib:new THREE.MeshStandardMaterial({color:0x2e3032,roughness:.88}),
  drive:new THREE.MeshStandardMaterial({color:0x2c2e30,roughness:.91})
};
const assets=new Map();
const fullTurn=2*Math.PI;
const bands=[[-.82,-.44],[-.36,-.04],[.04,.36],[.44,.82]];

// O perfil gira em torno de Z. A última secção fecha o talão oco.
function revolve(profile,segments){
  const positions=[];
  const indices=[];
  for(const [radius,z] of profile){
    for(let i=0;i<segments;i++){
      const angle=fullTurn*i/segments;
      positions.push(radius*Math.cos(angle),radius*Math.sin(angle),z);
    }
  }
  for(let ring=0;ring<profile.length;ring++){
    const nextRing=(ring+1)%profile.length;
    for(let i=0;i<segments;i++){
      const next=(i+1)%segments;
      const a=ring*segments+i,b=ring*segments+next;
      const c=nextRing*segments+next,d=nextRing*segments+i;
      indices.push(a,b,c,a,c,d);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function sidewalls(radius,halfWidth,baseRadius,distant=false){
  const side=distant
    ?[[.61,-.72],[.68,-.94],[.83,-1],[.95,-.92]]
    :[[.61,-.72],[.62,-.94],[.66,-.97],[.70,-.93],
      [.81,-.99],[.84,-1],[.92,-.95],[.96,-.88]];
  const back=side.map(([r,z])=>[r*radius,z*halfWidth]);
  back.push([baseRadius,-.82*halfWidth]);
  return [back,back.map(([r,z])=>[r,-z]).reverse()];
}

function treadBlocks(radius,halfWidth,baseRadius,tread){
  const positions=[];
  const indices=[];
  const pitchCount=tread==='drive'?32:40;
  const pitch=fullTurn/pitchCount;
  const gap=tread==='drive'?.24:.13;
  const offset=tread==='drive'?[.18,0,.5,.68]:[.38,0,.04,.42];
  const skew=tread==='drive'?[.18,-.12,.12,-.18]:[.1,.03,-.03,-.1];
  // As faces interiores ficam dentro da carcaça. As faces visíveis partilham uma malha.
  const faces=[[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];

  for(const [row,[from,to]] of bands.entries()){
    const outerShoulder=row===0||row===bands.length-1;
    const startRadius=outerShoulder&&row===0?radius*.991:radius;
    const endRadius=outerShoulder&&row!==0?radius*.991:radius;
    const z0=from*halfWidth,z1=to*halfWidth;
    for(let i=0;i<pitchCount;i++){
      const start=(i+offset[row])*pitch;
      const end=start+pitch*(1-gap);
      const lean=pitch*skew[row];
      const angles=[start,end,end+lean,start+lean];
      const z=[z0,z0,z1,z1];
      const bottomRadius=baseRadius*.994;
      const radii=[bottomRadius,bottomRadius,bottomRadius,bottomRadius,
        startRadius,startRadius,endRadius,endRadius];
      for(const face of faces){
        const first=positions.length/3;
        for(const corner of face){
          const point=corner%4,angle=angles[point],r=radii[corner];
          positions.push(r*Math.cos(angle),r*Math.sin(angle),z[point]);
        }
        indices.push(first,first+1,first+2,first,first+2,first+3);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createTireAssets(radius,width,tread='rib'){
  const key=`${radius}:${width}:${tread}`;
  if(assets.has(key))return assets.get(key);

  const halfWidth=width/2;
  const depth=Math.min(radius*(tread==='drive'?.041:.033),width*.105);
  const baseRadius=radius-depth;
  const [back,front]=sidewalls(radius,halfWidth,baseRadius);
  const [distantBack,distantFront]=sidewalls(radius,halfWidth,baseRadius,true);
  // À distância, os sulcos contínuos são suficientes.
  const distantTread=bands.flatMap(([from,to])=>[
    [baseRadius,(from+.01)*halfWidth],
    [radius,(from+.03)*halfWidth],
    [radius,(to-.03)*halfWidth],
    [baseRadius,(to-.01)*halfWidth]
  ]);
  const result={
    bodyGeometry:revolve([...back,...front],36),
    treadGeometry:treadBlocks(radius,halfWidth,baseRadius,tread),
    distantBodyGeometry:revolve([...distantBack,...distantTread,...distantFront],16),
    bodyMaterial,
    treadMaterial:treadMaterials[tread]
  };
  assets.set(key,result);
  return result;
}
