import { GallerySummary } from "./ehentai"
import { parseGalleryRef } from "./pure"
import { workTitleLines } from "./galleryCopy"

export function galleryGridColumnCount(sizeClass:string|null|undefined){return sizeClass==="compact"?1:3}
export function selectGallery<T>(current:T|null,next:T|null){return next}
export function galleryOpenMode(_sizeClass:string|null|undefined){return "push" as const}
export function swipeBackShouldPop(startX:number,translationWidth:number,translationHeight=0,edge=24,distance=72){const dx=Number(translationWidth),dy=Number(translationHeight);return Number(startX)<=edge&&dx>=distance&&Math.abs(dx)>=Math.abs(dy)}
export function heartFillForSlot(slot:number,rating:number):"empty"|"half"|"full"{const value=Number(rating);if(!Number.isFinite(value)||value<=0)return"empty";if(value>=slot)return"full";return value>=slot-0.5?"half":"empty"}
export function pickHeartRating(slot:number,half:boolean){const n=Math.trunc(Number(slot));if(n<1||n>5)return 0;return half?n-0.5:n}
export function displayedHeartRating(userRating:number,average:number|null|undefined){if(Number(userRating)>0)return Number(userRating);const value=Number(average);return Number.isFinite(value)&&value>0?value:0}
export function nextHeartRating(slot:number,currentPick:number){const n=Math.trunc(Number(slot));if(n<1||n>5)return 0;return Number(currentPick)===n?n-0.5:n}
export function galleryCardTitleLines(){return workTitleLines("card")}
export function relationSummary(summary:GallerySummary,relation:{label:string;url:string}):GallerySummary{const ref=parseGalleryRef(relation.url);return{...summary,id:relation.url,gid:ref?.gid||"",token:ref?.token||"",title:relation.label,thumb:"",posted:"",uploader:"",pages:0,url:relation.url}}
export function eagerHomeThumb(index:number){return Number(index)<6}
