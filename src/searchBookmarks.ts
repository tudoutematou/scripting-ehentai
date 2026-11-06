import { GallerySearchState } from "./tourist"
import { saveSearch } from "./libraryStore"
import { searchBookmarkDefaultTitle } from "./searchModel"

export async function saveSearchBookmark(state:GallerySearchState){const title=await prompt({title:"保存搜索书签",message:"只会保存在本机，保存后留在当前页。",defaultValue:searchBookmarkDefaultTitle(state),confirmLabel:"保存",cancelLabel:"取消"});if(title==null)return null;const name=title.trim()||searchBookmarkDefaultTitle(state);await saveSearch(state,name);return name}
