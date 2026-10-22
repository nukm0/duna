export const bodyTypes=['Тент','Реф','Изотерм'] as const;
export const loadingTypes=['Зад','Зад/бок','Зад/верх','Зад/верх/бок'] as const;
export type TruckOptions={body:typeof bodyTypes[number];loading:typeof loadingTypes[number];belts:boolean;hydrolift:boolean};
export const defaultTruckOptions:TruckOptions={body:'Тент',loading:'Зад',belts:false,hydrolift:false};
export const dimensions:Record<string,string>={'duna-2t':'4 × 2 × 2,2 м','truck-3t':'5,2 × 2,2 × 2,2 м'};
export function truckOptionLines(o:TruckOptions){return ['Тип кузова: '+o.body,'Погрузка: '+o.loading,'Доп. параметры: '+([o.belts?'Ремни':'',o.hydrolift?'Гидроборт':''].filter(Boolean).join(', ')||'Не выбраны')];}
export function validTruckOptions(o:unknown):o is TruckOptions{if(!o||typeof o!=='object')return false;const v=o as TruckOptions;return bodyTypes.includes(v.body)&&loadingTypes.includes(v.loading)&&typeof v.belts==='boolean'&&typeof v.hydrolift==='boolean';}
