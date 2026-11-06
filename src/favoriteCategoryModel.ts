import { type FavoriteCategory } from "./favorites"

export type FavoriteCategorySelection = number | undefined
export function favoriteCategoryChanged(current:FavoriteCategorySelection,next:FavoriteCategorySelection){return current!==next}
export function favoriteCategoryChoices(categories: readonly FavoriteCategory[]){return [{index:undefined as FavoriteCategorySelection,name:"全部收藏",count:categories.reduce((total,item)=>total+Math.max(0,Number(item.count)||0),0)},...categories.map(item=>({index:item.index as FavoriteCategorySelection,name:item.name,count:item.count}))]}
export function favoriteCategoryChoiceLabel(category:FavoriteCategorySelection,categories:readonly FavoriteCategory[]){const choice=favoriteCategoryChoices(categories).find(item=>item.index===category);return `${choice?.name||"全部收藏"} · ${choice?.count||0}`}
export function favoriteCategoryPickerValue(category:FavoriteCategorySelection){return category==null?"all":String(category)}
export function favoriteCategoryFromPickerValue(value:string):FavoriteCategorySelection{if(value==="all"||value==="")return undefined;const index=Number(value);return Number.isInteger(index)?index:undefined}
