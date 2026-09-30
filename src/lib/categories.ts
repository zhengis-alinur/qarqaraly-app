// Какие поля формы имеют смысл для каждой категории. Цена и удобства скрываются там, где они
// бессмысленны: у достопримечательности нет стоимости за ночь, у магазина — Wi-Fi и парковки.
// Справочник категорий редактируется в админке, поэтому для незнакомого идентификатора показываем всё.
export type CategoryFields = {price:boolean; priceUnit:string; amenities:boolean; conditions:boolean};
const byCategory:Record<string,CategoryFields> = {
 stay:{price:true,priceUnit:'за ночь',amenities:true,conditions:true},
 food:{price:true,priceUnit:'за человека',amenities:true,conditions:true},
 activities:{price:true,priceUnit:'за человека',amenities:true,conditions:true},
 transport:{price:true,priceUnit:'за час',amenities:false,conditions:true},
 shops:{price:true,priceUnit:'за услугу',amenities:false,conditions:false},
 recreation:{price:true,priceUnit:'за человека',amenities:true,conditions:true},
 kumys:{price:true,priceUnit:'за услугу',amenities:false,conditions:false},
 sights:{price:false,priceUnit:'за услугу',amenities:false,conditions:true},
 city:{price:false,priceUnit:'за услугу',amenities:false,conditions:false},
};
export const categoryFields=(category:string):CategoryFields=>byCategory[category]||{price:true,priceUnit:'за услугу',amenities:true,conditions:true};
/** Приводит карточку к правилам её категории: скрытое поле не должно уезжать в каталог. */
export function applyCategoryRules<T extends {category:string;price:number|null;priceUnit:string;amenities:string[];conditions:string}>(data:T):T {
 const fields=categoryFields(data.category);
 return {...data,
  price:fields.price?data.price:null,
  priceUnit:fields.price?data.priceUnit:fields.priceUnit,
  amenities:fields.amenities?data.amenities:[],
  conditions:fields.conditions?data.conditions:''};
}
