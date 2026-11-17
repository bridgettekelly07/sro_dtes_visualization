<script lang="ts">
  import MapStory from './lib/district/MapStory.svelte'
  import { chapterOne } from './lib/data/stops'
  // The page is chapter 1 told on the map. Other views are kept, not shown:
  //   DistrictMap.svelte  the free-roaming base map, with zoom and orbit
  //   StoryView.svelte    the chapters, timeline and room chart
  //   CityAxon.svelte     the earlier line drawing made from the City's 2009 footprints
</script>

<MapStory chapter={chapterOne} />
