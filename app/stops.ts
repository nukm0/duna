export type Stops={loading:string[];unloading:string[]};
export function validStops(value:unknown):value is Stops{
 if(!value||typeof value!=='object')return false;
 const s=value as Stops;
 return [s.loading,s.unloading].every(points=>Array.isArray(points)&&points.length>=1&&points.length<=2&&points.every(p=>typeof p==='string'&&p.trim().length>0&&p.length<=250));
}
export function extraPointCount(stops:Stops){return stops.loading.length+stops.unloading.length-2;}
export function stopLines(stops:Stops){return [...stops.loading.map((a,i)=>`Погрузка ${i+1}: ${a}`),...stops.unloading.map((a,i)=>`Выгрузка ${i+1}: ${a}`)];}
export function routePoints(from:string,to:string,stops:Stops){return [...stops.loading.map(a=>[from,a.trim()].filter(Boolean).join(', ')),...stops.unloading.map(a=>[to,a.trim()].filter(Boolean).join(', '))];}
