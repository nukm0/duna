export type Stops={loading:string[];unloading:string[]};
export function validStops(value:unknown):value is Stops{
 if(!value||typeof value!=='object')return false;
 const s=value as Stops;
 return [s.loading,s.unloading].every(points=>Array.isArray(points)&&points.length>=1&&points.length<=2&&points.every(p=>typeof p==='string'&&p.trim().length>0&&p.length<=250));
}
export function extraPointCount(stops:Stops){return stops.loading.length+stops.unloading.length-2;}
export function stopLines(stops:Stops){return [...stops.loading.map((a,i)=>`Погрузка ${i+1}: ${a}`),...stops.unloading.map((a,i)=>`Выгрузка ${i+1}: ${a}`)];}
export type StopKind=keyof Stops;
export type Coordinates=[number,number];
export type MapSelection={kind:StopKind;index:number;address:string;coordinates:Coordinates};
export type MapTarget={kind:StopKind;index:number;label:string};
export function routePoints(from:string,to:string,stops:Stops,selections:MapSelection[]=[]){
 return (['loading','unloading'] as const).flatMap(kind=>stops[kind].map((address,index)=>{
  const selected=selections.find(p=>p.kind===kind&&p.index===index&&p.address===address);
  return selected?selected.coordinates:[kind==='loading'?from:to,address.trim()].filter(Boolean).join(', ');
 }));
}

export function validMapSelections(value:unknown,stops:Stops):value is MapSelection[]{
 if(!Array.isArray(value)||value.length>4)return false;
 const keys=new Set<string>();
 return value.every(p=>{
  if(!p||typeof p!=='object'||!['loading','unloading'].includes(p.kind)||!Number.isInteger(p.index)||p.index<0||p.index>=stops[p.kind as StopKind].length||p.address!==stops[p.kind as StopKind][p.index]||!Array.isArray(p.coordinates)||p.coordinates.length!==2||!p.coordinates.every(Number.isFinite)||Math.abs(p.coordinates[0])>90||Math.abs(p.coordinates[1])>180)return false;
  const key=p.kind+':'+p.index;if(keys.has(key))return false;keys.add(key);return true;
 });
}
export function mapSelectionLines(selections:MapSelection[]){return selections.map(p=>'Координаты '+(p.kind==='loading'?'погрузки ':'выгрузки ')+(p.index+1)+': '+p.coordinates.map(n=>n.toFixed(6)).join(', '));}
