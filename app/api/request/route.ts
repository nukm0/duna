export const runtime = 'nodejs';
import {calculate} from '../../pricing';
import {vehicles,trucks} from '../../vehicles';
import {freightTotals,type FreightItem} from '../../freight';
import {validTruckOptions,truckOptionLines} from '../../truck-options';
import {validStops,extraPointCount,stopLines,validMapSelections,mapSelectionLines} from '../../stops';
export async function POST(req:Request){
 const json=(message:string,status=400)=>Response.json({message},{status});
 if(req.headers.get('origin')!==new URL(req.url).origin)return json('Недопустимый источник запроса.',403);
 const body=await req.text();if(body.length>12000)return json('Слишком большой запрос.',413);
 let d;try{d=JSON.parse(body)}catch{return json('Проверьте данные заявки.')}
 if(!d||typeof d!=='object')return json('Проверьте данные заявки.');
 for(const k of ['name','phone','email','from','to','date'])if(typeof d[k]!=='string'||!d[k].trim()||d[k].length>150)return json('Заполните обязательные поля.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^[-+()\d\s]{6,30}$/.test(d.phone)||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||d.consent!=='on')return json('Проверьте телефон, почту, дату и согласие.');
 if(typeof d.comment!=='string'||d.comment.length>2000)return json('Проверьте описание груза.');
 const selectedVehicle=vehicles.find(v=>v.id===d.vehicleId);if(!selectedVehicle)return json('Выберите вариант перевозки.');
 const groupage=d.vehicleId==='groupage';
 const truck=groupage?undefined:trucks.find(t=>t.id===d.truckId);if(!groupage&&!truck)return json('Выберите машину.');
 if(!groupage&&!validTruckOptions(d.truckOptions))return json('Проверьте тип кузова и параметры погрузки.');
 let itemText=groupage?'':truckOptionLines(d.truckOptions).join('\n');
 if(groupage){if(!Array.isArray(d.items)||d.items.length<1||d.items.length>30||d.items.some((i:unknown)=>!i||typeof i!=='object'||['length','width','height','weight','quantity','unit'].some(k=>typeof (i as Record<string,unknown>)[k]!=='string')))return json('Проверьте грузовые места.');const totals=freightTotals(d.items as FreightItem[]);if(!totals.valid)return json('Проверьте параметры грузовых мест.');d.weight=totals.weight;d.volume=totals.volume;itemText=d.items.map((i:FreightItem,index:number)=>'Груз '+(index+1)+': '+i.length+' × '+i.width+' × '+i.height+' см; вес одного места '+i.weight+' '+i.unit+'; количество '+i.quantity+'; вращать: '+(i.rotate?'да':'нет')+'; штабелировать: '+(i.stack?'да':'нет')).join('\n');}
 const priced=!groupage&&selectedVehicle.priced&&Boolean(truck?.priced);
 if(!Number.isFinite(d.km)||d.km<=0||d.km>15000||!Number.isFinite(d.weight)||d.weight<=0||d.weight>(truck?.weight??20000)||!Number.isFinite(d.volume)||d.volume<=0||d.volume>(truck?.volume??115))return json('Проверьте расстояние и параметры груза.');
 if(!validStops(d.stops))return json('Укажите адреса: от одной до двух точек погрузки и от одной до двух точек выгрузки.');
 const mapSelections=d.mapSelections??[];if(!validMapSelections(mapSelections,d.stops))return json('Проверьте выбранные точки на карте.');
 const config=process.env;
 if(!config.RESEND_API_KEY||!config.ORDER_EMAIL||!config.MAIL_FROM)return json('Отправка заявок пока не подключена. Для приема заявок компании необходимо подключить почту.',503);
 const result=calculate(d.km,truck?.baseRate??54,extraPointCount(d.stops),truck?.pointRate??0),id=crypto.randomUUID().slice(0,8).toUpperCase();
 const text=`Заявка Дюна №${id}\nВариант перевозки: ${selectedVehicle.name}\nМашина: ${truck?.name??'Подбор для сборного груза'}\n${itemText}\nИмя: ${d.name}\nТелефон: ${d.phone}\nEmail: ${d.email}\nМаршрут: ${d.from} → ${d.to}\n${[...stopLines(d.stops),...mapSelectionLines(mapSelections)].join('\n')}\nРасстояние: ${d.km} км\nВес: ${d.weight} кг\nОбъем: ${d.volume} м³\nДата: ${d.date}\n${priced?`Базовая ставка: ${result.baseRate} ₽/км\nНадбавка за расстояние: +${result.surcharge}%\nОсновная стоимость: ${result.base} ₽\nДополнительные точки: ${result.extraPointCount} × ${result.pointRate} ₽ = ${result.extraPointsCost} ₽\nПредварительная стоимость: ${result.total} ₽`:'Стоимость: по согласованию. Наличие и параметры транспорта требуют подтверждения.'}\nКомментарий: ${d.comment}`;
 try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.MAIL_FROM,to:[config.ORDER_EMAIL],reply_to:d.email,subject:`Дюна: новая заявка №${id}`,text})});if(!r.ok)return json('Почтовый сервис не подтвердил отправку. Попробуйте позднее.',502);return json(`Заявка №${id} отправлена. Мы свяжемся с вами для согласования перевозки.`,200)}catch{return json('Не удалось отправить заявку. Попробуйте позднее.',502)}
}

