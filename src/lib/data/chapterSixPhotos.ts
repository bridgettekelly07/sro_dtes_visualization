/**
 * Photographs for the cards of chapter 6, by stop id. All are freely licensed files on Wikimedia
 * Commons, converted to greyscale here (the licences allow adaptation; those marked BY-SA
 * ask that the adapted file be shared on the same terms). They are later photographs of the
 * places, not of the events on the cards. Kept apart from chapterSix.ts so that the photographs can
 * change without touching the map.
 */
import type { Photo } from './stops'

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

export const chapterSixPhotos: Record<string, Photo[]> = {
  'memorial-march': [
    {
      file: 'chapter-6/womens-memorial-march-2010_commons-kim-kim.jpg',
      title: "The 19th annual Women's Memorial March, Vancouver",
      date: '14 February 2010',
      alt: 'Seen from behind, a woman in a wheelchair and a standing woman, both in dark button blankets and headbands, among marchers in the street.',
      credit: 'kim kim, CC BY 2.0',
      ref: 'Wikimedia Commons',
      recordUrl: commons("19th_Annual_Women's_Memorial_March,_Vancouver_(4361313177).jpg"),
      sourceId: 'commons-memorial-march-2010',
    },
  ],
  'woodwards-closes': [
    {
      file: 'chapter-6/woodwards-demolition-2006_commons-alpha.jpg',
      title: "Demolition of the Woodward's building, seen from the Harbour Centre lookout",
      date: '13 August 2006',
      alt: 'From above, the concrete frame of a partly demolished department store, its floors broken and rubble in the middle, among older brick blocks.',
      credit: 'ּα (Vienna, Austria), CC BY 2.0',
      ref: 'Wikimedia Commons',
      recordUrl: commons("Woodward's_building_demolition_Vancouver_2006.jpg"),
      sourceId: 'commons-woodwards-demolition-2006',
    },
  ],
}
