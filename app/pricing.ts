const city=(s:string)=>s.split(',')[0].toLowerCase().trim().replace(/ё/g,'е').replace(/[.\s-]/g,'').replace(/^спб$/,'санктпетербург');
export function calculate(km:number,from:string,to:string,baseRate=54,minimum=3000){
 const a=city(from),b=city(to);
 const discount=(a==='мурманск'&&['петрозаводск','санктпетербург','москва'].includes(b))||(a==='петрозаводск'&&['санктпетербург','москва'].includes(b));
 const surcharge=km<=40?185:km<=100?100:km<=150?30:km<=300?20:0;
 const rate=baseRate*(1+surcharge/100);
 const distanceCost=km*baseRate;
 const surchargeCost=distanceCost*surcharge/100;
 const base=Math.max(minimum,Math.round(distanceCost+surchargeCost));
 return {baseRate,surcharge,rate,distanceCost,surchargeCost,minimum,minimumApplied:distanceCost+surchargeCost<minimum,base,discount,total:Math.round(base*(discount?0.7:1))};
}
