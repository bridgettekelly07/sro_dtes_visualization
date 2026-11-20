/**
 * Photographs for the cards of chapter 5, by stop id. All are freely licensed files on Wikimedia
 * Commons, converted to greyscale here (the licences allow adaptation; those marked BY-SA
 * ask that the adapted file be shared on the same terms). They are later photographs of the
 * places, not of the events on the cards. Kept apart from chapterFive.ts so that the photographs can
 * change without touching the map.
 */
import type { Photo } from './stops'

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

export const chapterFivePhotos: Record<string, Photo[]> = {
  'carnegie-centre': [
    {
      file: 'chapter-5/carnegie-main-hastings-2007_commons-joe-mabel.jpg',
      title: 'Carnegie Centre, the former Carnegie Public Library, Main and Hastings',
      date: '22 March 2007',
      alt: 'A domed stone building on a street corner in the rain, with traffic lights and trolley wires in front and a brick hotel at the right.',
      credit: 'Joe Mabel, CC BY-SA 3.0',
      ref: 'Wikimedia Commons',
      recordUrl: commons('Vancouver_Carnegie.jpg'),
      sourceId: 'commons-vancouver-carnegie',
    },
  ],
}
