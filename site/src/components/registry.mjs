/**
 * The component registry: each view block type names the compound that renders it.
 * A block type without an entry fails validation before anything renders (tested
 * against design/views/view.schema.json).
 */
import { AreaTiles, Hero, ItemTiles, StackTiles, StatStrip } from './compounds/overview.mjs';
import { AddsTree, CompatGrid, EffectsChips, GetItPanel, ItemBody, ItemHeader, KitAnatomy, SourceViewer, StackPath, WorksWith } from './compounds/item.mjs';
import { EmptyState, FacetBar, ReleaseTimeline, Text } from './compounds/index-page.mjs';

export const REGISTRY = {
  hero: Hero,
  'stat-strip': StatStrip,
  'area-tiles': AreaTiles,
  'item-tiles': ItemTiles,
  'stack-tiles': StackTiles,
  'facet-bar': FacetBar,
  'release-timeline': ReleaseTimeline,
  'item-header': ItemHeader,
  'get-it-panel': GetItPanel,
  'effects-chips': EffectsChips,
  'compat-grid': CompatGrid,
  'adds-tree': AddsTree,
  'kit-anatomy': KitAnatomy,
  'stack-path': StackPath,
  'works-with': WorksWith,
  'item-body': ItemBody,
  'source-viewer': SourceViewer,
  text: Text,
  'empty-state': EmptyState,
};
