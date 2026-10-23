// Yandex returns the road distance in metres; preserve metre precision in kilometres.
export function mapDistanceKm(metres:number){
 if(!Number.isFinite(metres)||metres<=0)throw new Error('Некорректная длина маршрута.');
 return Math.max(0.001,Math.round(metres)/1000);
}
