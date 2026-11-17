<script lang="ts">
  import MapStory from './lib/district/MapStory.svelte'
  import { chapterOne } from './lib/data/stops'
  import { chapterTwo } from './lib/data/chapterTwo'
  import { chapterThree } from './lib/data/chapterThree'
  // The page is the story told on the map, chapter by chapter. Other views are kept, not shown:
  //   DistrictMap.svelte  the free-roaming base map, with zoom and orbit
  //   StoryView.svelte    the chapters, timeline and room chart
  //   CityAxon.svelte     the earlier line drawing made from the City's 2009 footprints
</script>

<MapStory story={[chapterOne, chapterTwo, chapterThree]} />
