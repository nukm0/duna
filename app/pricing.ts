export function calculate(km:number,baseRate=54,extraPointCount=0,pointRate=0){
 const surcharge=km<=10?0:km<=40?185:km<=100?100:km<=150?30:km<=300?20:0;
 const rate=baseRate*(1+surcharge/100);
 const minimumApplied=km>0&&km<=10;
 const base=minimumApplied?3000:Math.round(km*baseRate*(1+surcharge/100));
 const extraPointsCost=extraPointCount*pointRate;
 return {baseRate,surcharge,rate,minimumApplied,base,extraPointCount,pointRate,extraPointsCost,total:base+extraPointsCost};
}
