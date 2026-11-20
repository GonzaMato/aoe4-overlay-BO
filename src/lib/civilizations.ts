import { label } from './i18n';

const flags: Record<string,string> = {
 English:'english',French:'french','Holy Roman Empire':'holy_roman_empire',Rus:'rus',Mongols:'mongols',Chinese:'chinese',
 'Delhi Sultanate':'delhi_sultanate','Abbasid Dynasty':'abbasid_dynasty',Ottomans:'ottomans',Malians:'malians',Byzantines:'byzantines',Japanese:'japanese',
 'Order of the Dragon':'order_of_the_dragon',"Zhu Xi's Legacy":'zhu_xis_legacy',"Jeanne d'Arc":'jeanne_darc',Ayyubids:'ayyubids',
 'Knights Templar':'knights_templar','House of Lancaster':'house_of_lancaster','Golden Horde':'golden_horde','Macedonian Dynasty':'macedonian_dynasty',
 'Sengoku Daimyo':'sengoku_daimyo','Tughlaq Dynasty':'tughlaq_dynasty','Jin Dynasty':'jin_dynasty',Vikings:'vikings',Scots:'scots'
};
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").trim().toLowerCase();
export function civilizationKey(civ:string):string | null {
 const entry=Object.keys(flags).find(name=>[name,label(name,'es')].some(alias=>normalized(alias)===normalized(civ)));
 return entry ? flags[entry] : null;
}
export function civilizationFlag(civ:string):string {
 return `/civilizations/${civilizationKey(civ) ?? 'unknown'}.png`;
}
