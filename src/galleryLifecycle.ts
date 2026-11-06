
export let mountedGalleryDetails=0
export const galleryDetailListeners=new Set<(count:number)=>void>()
export function mountGalleryDetail(){
  let mounted=true
  mountedGalleryDetails+=1
  galleryDetailListeners.forEach(listener=>listener(mountedGalleryDetails))
  return()=>{if(!mounted)return;mounted=false;mountedGalleryDetails-=1;galleryDetailListeners.forEach(listener=>listener(mountedGalleryDetails))}
}
export function subscribeGalleryDetailCount(listener:(count:number)=>void){galleryDetailListeners.add(listener);listener(mountedGalleryDetails);return()=>{galleryDetailListeners.delete(listener)}}
