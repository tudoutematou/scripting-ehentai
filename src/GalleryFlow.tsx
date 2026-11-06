/** Client composition root. Feature modules must not import this file.
 * Factories run exactly once and must only define components, never render targets.
 * Stable forwarding components resolve mutual navigation at render time without
 * module import cycles, global registration, or calling hook components directly.
 */
import type { SceneDestinations } from "./sceneDestinations"
import { createGalleryNavigation } from "./GalleryNavigation"
import { createSearchScenes } from "./SearchScenes"
import { createDiscoverScene } from "./DiscoverScene"
import { createGalleryDetailScene } from "./GalleryDetailScene"
import { createLibraryScenes } from "./LibraryScenes"
const destinations: SceneDestinations = {
  AIRecommendationFlow: () => <scenes_SearchScenes.AIRecommendationFlow/>, 
  CoverSearchScene: props => <scenes_SearchScenes.CoverSearchScene {...props}/>, 
  DiscoveryScene: props => <scenes_LibraryScenes.DiscoveryScene {...props}/>, 
  GalleryDetailView: props => <scenes_GalleryDetailScene.GalleryDetailView {...props}/>, 
  GalleryGrid: props => <scenes_GalleryNavigation.GalleryGrid {...props}/>, 
  HistoryScene: () => <scenes_LibraryScenes.HistoryScene/>, 
  ImageSearchScene: () => <scenes_SearchScenes.ImageSearchScene/>, 
  LibraryGalleryGrid: props => <scenes_GalleryNavigation.LibraryGalleryGrid {...props}/>, 
  QuickSearchScene: () => <scenes_LibraryScenes.QuickSearchScene/>, 
  ResultsView: props => <scenes_SearchScenes.ResultsView {...props}/>, 
  SearchComposer: props => <scenes_SearchScenes.SearchComposer {...props}/>, 
  listedGalleryDestination: (...args) => scenes_GalleryNavigation.listedGalleryDestination(...args),
  openListedGallery: (...args) => scenes_GalleryNavigation.openListedGallery(...args),
}
const scenes_GalleryNavigation = createGalleryNavigation(destinations)
const scenes_SearchScenes = createSearchScenes(destinations)
const scenes_DiscoverScene = createDiscoverScene(destinations)
const scenes_GalleryDetailScene = createGalleryDetailScene(destinations)
const scenes_LibraryScenes = createLibraryScenes(destinations)
export const { openListedGallery, listedGalleryDestination, LibraryGalleryGrid, GalleryGrid } = scenes_GalleryNavigation
export const { AITagChooser, AISearchFlow, AIRecommendationFlow, SearchComposer, SearchScene, FilterView, ResultsView, ImageSearchScene, CoverSearchScene, HomeFilterEntry } = scenes_SearchScenes
export const { DiscoverWidthProbe, DiscoverCoverCard, DiscoverShowcase, ContinueReadingCard, ContinueReadingStrip, RecentDiscoverShelf, HomeScene } = scenes_DiscoverScene
export const { downloadPreparedLabel, GalleryDetailView } = scenes_GalleryDetailScene
export const { GalleryButton, FavoritesScene, CloudFavoritesContent, HistoryScene, QuickSearchScene, DiscoveryScene, SettingsScene, MyTagsScene, LocalBookmarksScene, DownloadsScene, CacheScene, FavoriteCategoryManagementScene, LibraryManagementScene, LibraryScene } = scenes_LibraryScenes
export { readerSwipeAction, type ReaderTapZone, type ReaderTapAction, type ReaderOverlay, readerOverlayAfterAction, readerOverlayAfterAutoPlay, readerTapAction, readerTargetIndex, readerPageNumber, readerTargetGalleryPage, readerInventoryGap, readerNavigationRequestIsCurrent, readerJumpTarget, shouldScheduleAutoPage, canAdvanceReaderPage, readerControlActions, readerSliderDisplayPage, type ReaderZoomState, clampReaderScale, readerZoomed, clampReaderOffset, readerZoomAfterPageChange, readerViewportFrame, continueReadingPage, offlineResumeDownload, readerInitialGalleryPage, previewReaderSessionKey, type OfflineReaderPage, offlineReaderPositionLabel, mergeOfflineReaderPages, offlineReaderTargetIndex, offlineReaderAdvanceIndex, offlineReaderIndexForGalleryIndex } from "./readerModel"
export { ReaderProgressOverlay } from "./ReaderUI"
export { ReaderView } from "./OnlineReader"
export { OfflineReaderView } from "./OfflineReader"
export { galleryIdentity, mergePreviewPages } from "./galleryIdentity"
export { workTitle, workTitleFont, workTitleLines, readingProgressLabel, continueReadingTitle, readerPageCaption, historyStatusLabel, localBookmarkStatusLabel, downloadPhaseLabel, libraryDownloadNote } from "./galleryCopy"
export { galleryGridColumnCount, selectGallery, galleryOpenMode, swipeBackShouldPop, heartFillForSlot, pickHeartRating, displayedHeartRating, nextHeartRating, galleryCardTitleLines, relationSummary, eagerHomeThumb } from "./galleryModel"
export { PREVIEW_WIDTH, detailCoverRequestOptions } from "./GalleryImages"
export { GalleryRating, GalleryRow, GalleryCard } from "./GalleryCards"
export { mountGalleryDetail, subscribeGalleryDetailCount } from "./galleryLifecycle"
export { searchComposerCanSubmit, searchComposerActionDestination, searchBookmarkDefaultTitle, glassGroupMixesInPlaceAndNavigation } from "./searchModel"
export { AccountScene } from "./AccountScene"
export { ImageDiagnosticsScene } from "./ImageDiagnosticsScene"
export { discoverGridMetrics, discoverCoverFrame, type DiscoverFeed, discoverFeedUrl, mergeDiscoverGalleries, discoverNextCursor } from "./discoverModel"
export { MOBILE_DETAIL_SECTION_ORDER, previewSummaryPages, mobilePreviewSummaryPages, previewNeedsMore, PREVIEW_SCROLL_LEADING_THRESHOLD, previewScrollLeadingShouldLoad, PREVIEW_BROWSER_WINDOW, previewBrowserWindow, previewPageRangeForIndexes, togglePreviewSelection, selectedPreviewPages, selectionModeAfterDone, downloadSelectionSnapshot, type SelectionGestureMode, dragSelectionTarget, applySelectionGesture, photosProgressLabel, compactPreviewColumnCount, previewScrollRequestAllowed, nextPreviewRange, previewBatchRange, previewJumpRange } from "./previewModel"
export { PreviewGrid, AllPreviewsScene } from "./GalleryPreviews"
export { MobileDetailIdentity, PrimaryReadingButton } from "./GalleryDetailUI"
export { type FavoriteCategorySelection, favoriteCategoryChanged, favoriteCategoryChoices, favoriteCategoryChoiceLabel, favoriteCategoryPickerValue, favoriteCategoryFromPickerValue } from "./favoriteCategoryModel"
