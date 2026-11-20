/**
 * Photographs for the cards of chapter 7, by stop id. All are freely licensed files on Wikimedia
 * Commons, converted to greyscale here (the licences allow adaptation; those marked BY-SA
 * ask that the adapted file be shared on the same terms). They are later photographs of the
 * places, not of the events on the cards. Kept apart from chapterSeven.ts so that the photographs can
 * change without touching the map.
 */
import type { Photo } from './stops'

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

export const chapterSevenPhotos: Record<string, Photo[]> = {
  'woodwards-rebuilt': [
    {
      file: 'chapter-7/woodwards-building-2015_commons-xicotencatl.jpg',
      title: "The rebuilt Woodward's complex, Vancouver",
      date: '2 August 2015',
      alt: 'A tall residential tower rising from a low, older brick-and-stone building, seen across a park with trees and street lamps.',
      credit: 'Xicotencatl, CC BY-SA 4.0',
      ref: 'Wikimedia Commons',
      recordUrl: commons('Woodwards_Building_Vancouver_03.JPG'),
      sourceId: 'commons-woodwards-2015',
    },
  ],
  'balmoral-regent': [
    {
      file: 'chapter-7/balmoral-hotel-2012_commons-canadian2006.jpg',
      title: 'Balmoral Hotel, 159 East Hastings Street',
      date: '21 April 2012',
      alt: 'A tall brick hotel with its name painted large on the side wall and a vertical neon sign, two vans parked at the kerb below.',
      credit: 'Canadian2006, CC BY-SA 3.0',
      ref: 'Wikimedia Commons',
      recordUrl: commons('Balmoral_Hotel_Vancouver.JPG'),
      sourceId: 'commons-balmoral-2012',
    },
  ],
}
