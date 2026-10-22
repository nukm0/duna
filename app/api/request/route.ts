export const runtime = 'nodejs';
import {calculate} from '../../pricing';
export async function POST(req:Request){
 const json=(message:string,status=400)=>Response.json({message},{status});
 if(req.headers.get('origin')!==new URL(req.url).origin)return json('Недопустимый источник запроса.',403);
 const body=await req.text();if(body.length>12000)return json('Слишком большой запрос.',413);
 let d;try{d=JSON.parse(body)}catch{return json('Проверьте данные заявки.')}
 if(!d||typeof d!=='object')return json('Проверьте данные заявки.');
 for(const k of ['name','phone','email','from','to','date'])if(typeof d[k]!=='string'||!d[k].trim()||d[k].length>150)return json('Заполните обязательные поля.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^[-+()\d\s]{6,30}$/.test(d.phone)||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||d.consent!=='on')return json('Проверьте телефон, почту, дату и согласие.');
 if(typeof d.comment!=='string'||d.comment.length>2000)return json('Проверьте описание груза.');
 if(!Number.isFinite(d.km)||d.km<=0||d.km>15000||!Number.isFinite(d.weight)||d.weight<=0||d.weight>2000||!Number.isFinite(d.volume)||d.volume<=0||d.volume>10)return json('Груз должен быть до 2 тонн и 10 м³. Проверьте расстояние.');
 const config=process.env;
 if(!config.RESEND_API_KEY||!config.ORDER_EMAIL||!config.MAIL_FROM)return json('Отправка заявок пока не подключена. Для приема заявок компании необходимо подключить почту.',503);
 const result=calculate(d.km,d.from,d.to),id=crypto.randomUUID().slice(0,8).toUpperCase();
 const text=`Заявка Дюна №${id}\nИмя: ${d.name}\nТелефон: ${d.phone}\nEmail: ${d.email}\nМаршрут: ${d.from} → ${d.to}\nРасстояние: ${d.km} км\nВес: ${d.weight} кг\nОбъем: ${d.volume} м³\nДата: ${d.date}\nОсновная стоимость: ${result.base} ₽\nСкидка: ${result.discount?'30%':'нет'}\nПредварительная стоимость: ${result.total} ₽\nКомментарий: ${d.comment}`;
 try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.MAIL_FROM,to:[config.ORDER_EMAIL],reply_to:d.email,subject:`Дюна: новая заявка №${id}`,text})});if(!r.ok)return json('Почтовый сервис не подтвердил отправку. Попробуйте позднее.',502);return json(`Заявка №${id} отправлена. Мы свяжемся с вами для согласования перевозки.`,200)}catch{return json('Не удалось отправить заявку. Попробуйте позднее.',502)}
}

