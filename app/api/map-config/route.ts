export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){const apiKey=process.env.YANDEX_MAPS_API_KEY;if(!apiKey)return Response.json({message:'Яндекс Карты не настроены.'},{status:503});return Response.json({apiKey},{headers:{'Cache-Control':'private, no-store'}})}
