"use client";
import {useEffect,useRef,useState} from 'react';
import type {Coordinates,MapSelection,MapTarget} from './stops';
import {mapDistanceKm} from './map-distance';
type MapEvent={get:(name:string)=>unknown};
type Events={add:(event:string,callback:(event:MapEvent)=>void)=>void};
type ActiveRoute={properties:{get:(name:string)=>{value:number;text:string}|undefined}};
type MultiRoute={model:{events:Events};events:Events;getActiveRoute:()=>ActiveRoute|null};
type YMap={events:Events;geoObjects:{add:(object:unknown)=>void;remove:(object:unknown)=>void};behaviors:{enable:(names:string[])=>void};getZoom:()=>number;setZoom:(zoom:number,options?:Record<string,unknown>)=>void;setCenter:(center:Coordinates,zoom:number,options?:Record<string,unknown>)=>void;destroy:()=>void};
type GeocodeObject={getAddressLine:()=>string;getLocalities:()=>string[];geometry:{getCoordinates:()=>Coordinates}};
type YMaps={ready:(callback:()=>void)=>void;Map:new(node:HTMLElement,state:{center:number[];zoom:number;controls:string[]},options?:Record<string,unknown>)=>YMap;Placemark:new(coordinates:Coordinates,properties:Record<string,unknown>,options:Record<string,unknown>)=>unknown;geocode:(request:string|Coordinates,options?:Record<string,unknown>)=>PromiseLike<{geoObjects:{get:(index:number)=>GeocodeObject|undefined}}>;multiRouter:{MultiRoute:new(model:{referencePoints:(string|Coordinates)[];params:{routingMode:string;results:number;avoidTrafficJams:boolean}},options:Record<string,unknown>)=>MultiRoute}};
declare global{interface Window{ymaps?:YMaps}}
const targetKey=(target:MapTarget|MapSelection)=>target.kind+':'+target.index;
const escapeMarkup=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
async function withTimeout<T>(value:PromiseLike<T>){let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([Promise.resolve(value),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Геокодер не ответил.')),10000)})]);}finally{if(timer)clearTimeout(timer);}}
let apiPromise:Promise<YMaps>|null=null;
function loadMaps():Promise<YMaps>{if(apiPromise)return apiPromise;apiPromise=(async()=>{const response=await fetch('/api/map-config');if(!response.ok)throw Error('Ключ Яндекс Карт пока не настроен.');const config=await response.json() as {apiKey:string};await new Promise<void>((resolve,reject)=>{if(window.ymaps){window.ymaps.ready(resolve);return;}const script=document.createElement('script');script.src='https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey='+encodeURIComponent(config.apiKey);script.async=true;const timer=setTimeout(()=>reject(Error('Яндекс Карты не ответили. Обновите страницу и постройте маршрут повторно.')),20000);script.onload=()=>{if(!window.ymaps){clearTimeout(timer);reject(Error('Не удалось загрузить Яндекс Карты. Проверьте доступ API для домена сайта.'));return;}window.ymaps.ready(()=>{clearTimeout(timer);resolve()})};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Не удалось загрузить Яндекс Карты. Проверьте соединение.'))};document.head.appendChild(script)});return window.ymaps!;})().catch(e=>{apiPromise=null;throw e});return apiPromise;}
type Props={from:string;to:string;points:(string|Coordinates)[];targets:MapTarget[];selections:MapSelection[];onPick:(selection:MapSelection,city?:string)=>void;onDistance:(km:string)=>void};
export default function RouteMap({from,to,points,targets,selections,onPick,onDistance}:Props){
 const pointsKey=JSON.stringify(points),selectionsKey=JSON.stringify(selections);
 const node=useRef<HTMLDivElement>(null),map=useRef<YMap|null>(null),api=useRef<YMaps|null>(null),route=useRef<MultiRoute|null>(null),markers=useRef<unknown[]>([]);
 const sequence=useRef(0),pickSequence=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[km,setKm]=useState<number|null>(null),[error,setError]=useState('');
 const [selectedTarget,setSelectedTarget]=useState<string|null>(null),[picking,setPicking]=useState(false),[pickStatus,setPickStatus]=useState('');
 const latest=useRef({targets,from,to,onPick,onDistance,selectedTarget});latest.current={targets,from,to,onPick,onDistance,selectedTarget};
 useEffect(()=>{
  let stopped=false;
  loadMaps().then(ymaps=>{
   if(stopped||!node.current)return;
   api.current=ymaps;
   const current=new ymaps.Map(node.current,{center:[62,37],zoom:4,controls:['fullscreenControl']});map.current=current;
   current.behaviors.enable(['scrollZoom','multiTouch','dblClickZoom','drag']);
   current.events.add('click',async event=>{
    const target=latest.current.targets.find(t=>targetKey(t)===latest.current.selectedTarget);
    const coords=event.get('coords');
    if(!target||!Array.isArray(coords)||coords.length!==2||!coords.every(Number.isFinite))return;
    const coordinates:Coordinates=[coords[0],coords[1]],requestId=++pickSequence.current;
    setPicking(true);setPickStatus('Определяем адрес выбранной точки…');
    let address='Координаты: '+coordinates.map(n=>n.toFixed(6)).join(', '),city:string|undefined;
    try{const result=await withTimeout(ymaps.geocode(coordinates,{results:1}));const object=result.geoObjects.get(0);if(object){address=object.getAddressLine()||address;city=object.getLocalities()[0];}}
    catch{/* Coordinates still preserve the exact selected location. */}
    if(stopped||requestId!==pickSequence.current||!latest.current.targets.some(t=>targetKey(t)===targetKey(target)))return;
    latest.current.onPick({kind:target.kind,index:target.index,address:address.slice(0,250),coordinates},city);
    latest.current.selectedTarget=null;setSelectedTarget(null);setPicking(false);setPickStatus(target.label+': '+address+'. Точка сохранена. Постройте маршрут для пересчёта километража.');
   });
   setReady(true);
  }).catch(e=>{if(!stopped)setError(e instanceof Error?e.message:'Не удалось загрузить карту.');});
  return()=>{stopped=true;sequence.current++;pickSequence.current++;if(timer.current)clearTimeout(timer.current);map.current?.destroy();map.current=null;};
 },[]);
 useEffect(()=>{sequence.current++;if(timer.current)clearTimeout(timer.current);if(route.current&&map.current)map.current.geoObjects.remove(route.current);route.current=null;setKm(null);latest.current.onDistance('');setBusy(false);},[from,to,pointsKey]);
 useEffect(()=>{
  if(!selectedTarget||targets.some(t=>targetKey(t)===selectedTarget))return;
  pickSequence.current++;latest.current.selectedTarget=null;setSelectedTarget(null);setPicking(false);setPickStatus('Точка удалена из маршрута.');
 },[targets,selectedTarget]);
 useEffect(()=>{
  if(!ready||!map.current||!api.current)return;
  for(const marker of markers.current)map.current.geoObjects.remove(marker);
  markers.current=selections.map(selection=>{
   const label=(selection.kind==='loading'?'Погрузка ':'Выгрузка ')+(selection.index+1);
   const marker=new api.current!.Placemark(selection.coordinates,{iconContent:selection.index+1,iconCaption:label,hintContent:escapeMarkup(label+': '+selection.address)},{preset:selection.kind==='loading'?'islands#violetIcon':'islands#pinkIcon'});
   map.current!.geoObjects.add(marker);return marker;
  });
 },[ready,selectionsKey]);
 async function chooseTarget(target:MapTarget){
  const key=targetKey(target),requestId=++pickSequence.current;
  setPicking(false);setError('');
  if(selectedTarget===key){latest.current.selectedTarget=null;setSelectedTarget(null);setPickStatus('Выбор точки отменён.');return;}
  latest.current.selectedTarget=key;setSelectedTarget(key);setPickStatus(target.label+': приблизьте карту и нажмите в нужном месте.');
  const existing=selections.find(s=>targetKey(s)===key);
  if(existing){map.current?.setCenter(existing.coordinates,16);return;}
  const city=target.kind==='loading'?from:to;
  if(!city.trim()||!api.current)return;
  try{const result=await withTimeout(api.current.geocode(city,{results:1}));const object=result.geoObjects.get(0);if(object&&requestId===pickSequence.current&&map.current)map.current.setCenter(object.geometry.getCoordinates(),14);}
  catch{/* Manual panning and zoom remain available. */}
 }
 function zoom(delta:number){if(map.current)map.current.setZoom(Math.max(2,Math.min(19,map.current.getZoom()+delta)),{duration:150});}
 function cancelPick(showStatus=true){pickSequence.current++;latest.current.selectedTarget=null;setSelectedTarget(null);setPicking(false);setPickStatus(showStatus?'Выбор точки отменён.':'');}
 function build(){
  if(!map.current||!api.current)return;
  cancelPick(false);const requestId=++sequence.current;if(timer.current)clearTimeout(timer.current);if(route.current)map.current.geoObjects.remove(route.current);
  setBusy(true);setError('');setKm(null);latest.current.onDistance('');
  const current=new api.current.multiRouter.MultiRoute({referencePoints:points,params:{routingMode:'auto',results:1,avoidTrafficJams:false}},{boundsAutoApply:true,routeActiveStrokeColor:'#a326e2',routeActiveStrokeWidth:5,wayPointStartIconFillColor:'#8746ca',wayPointFinishIconFillColor:'#8746ca'});route.current=current;
  const fail=()=>{if(requestId!==sequence.current)return;if(timer.current)clearTimeout(timer.current);setBusy(false);latest.current.onDistance('');setError('Не удалось построить маршрут Яндекс Карт. Проверьте адреса и постройте маршрут повторно.');};
  const update=()=>{if(requestId!==sequence.current)return;const distance=current.getActiveRoute()?.properties.get('distance')?.value;if(!Number.isFinite(distance)||!distance||distance<=0){fail();return;}if(timer.current)clearTimeout(timer.current);const value=mapDistanceKm(distance);setKm(value);latest.current.onDistance(String(value));setBusy(false);setError('');};
  current.model.events.add('requestsuccess',update);current.model.events.add('requestfail',fail);current.events.add('activeroutechange',update);timer.current=setTimeout(fail,25000);map.current.geoObjects.add(current);
 }
 return <div className="route-map-panel">
  <div className="map-picker-toolbar"><div className="map-picker-title"><b>Выберите адрес на карте</b><span>Нажмите на нужную точку ниже, затем укажите место на карте.</span></div><div className="map-targets" role="group" aria-label="Выбор точки маршрута">{targets.map(target=><button type="button" key={targetKey(target)} aria-label={'Выбрать '+(target.kind==='loading'?'погрузку ':'выгрузку ')+(target.index+1)+' на карте'} aria-pressed={selectedTarget===targetKey(target)} disabled={!ready||busy} onClick={()=>chooseTarget(target)}>{target.label}<span aria-hidden="true">⌖</span></button>)}</div><div className="map-zoom-controls"><span>Масштаб карты</span><button type="button" aria-label="Отдалить карту" disabled={!ready} onClick={()=>zoom(-1)}>−</button><button type="button" aria-label="Приблизить карту" disabled={!ready} onClick={()=>zoom(1)}>＋</button></div></div>
  {selectedTarget&&<div className="map-pick-instruction"><span>{picking?'Определяем адрес…':'Нажмите на карту — здесь будет выбранная точка'}</span><button type="button" onClick={()=>cancelPick()}>Отмена</button></div>}
  <div className={selectedTarget?'route-map yandex-map is-picking':'route-map yandex-map'} ref={node} aria-label="Яндекс Карта автомобильного маршрута"/>
  {pickStatus&&<p className="map-pick-status" role="status">{pickStatus}</p>}
  <button type="button" className="button sand route-build" disabled={!ready||busy||picking||!from.trim()||!to.trim()} onClick={build}>{!ready?'Загружаем Яндекс Карты…':busy?'Строим маршрут…':'Построить маршрут и рассчитать км'} <span>↗</span></button>
  {km!==null&&<div className="route-result" role="status"><b>{km.toLocaleString('ru-RU')} км</b><span>{from} → {to} · {points.length} точки · Яндекс Карты</span></div>}
  {error&&<p role="alert" className="map-error">{error}</p>}
  <p className="hint">Приближайте карту кнопками + / −, колёсиком мыши или двумя пальцами. Для выбора адреса нажмите «Погрузка» или «Выгрузка», затем на карту. Километраж берётся только из автомобильного маршрута Яндекс Карт по всем точкам. Проверьте ограничения для выбранного грузовика.</p>
 </div>;
}
