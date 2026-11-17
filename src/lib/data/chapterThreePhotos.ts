/**
 * Archival photographs for the cards of chapter 3, by stop id. Each City of Vancouver Archives
 * item is checked against its record, where it is marked "Copyright status: Public domain".
 * The one exception is the photograph of the riot's damage, from Vancouver Public Library,
 * which that library gives as having no known copyright restrictions (see its note below).
 * Kept apart from chapterThree.ts so that the photographs can change without touching the map.
 */
import type { Photo } from './stops'

const CVA = 'City of Vancouver Archives'
const record = (slug: string) => `https://searcharchives.vancouver.ca/${slug}`

export const chapterThreePhotos: Record<string, Photo[]> = {
  neighbours: [
    {
      file: 'chapter-3/dupont-street-unit-block-c1907_cva-1376-506.jpg',
      title: 'The south side of the unit block of Dupont (Pender) Street',
      date: 'about 1907',
      alt: 'Wooden two-storey shopfronts along an unpaved street, wagons and horses at the kerb, men talking in the road and one carrying two baskets on a pole.',
      note: 'The archive names the Gim Lee Yuen store at 32 Dupont and the Sam Kee building in the background. It dates the photograph to about 1907.',
      credit: CVA,
      ref: 'CVA 1376-506',
      recordUrl: record('south-side-of-unit-block-of-dupont-pender-street'),
      sourceId: 'cva-1376-506',
    },
    {
      file: 'chapter-3/in-chinatown-c1910_am1052-p-239.jpg',
      title: 'In Chinatown, Vancouver, B.C.',
      date: 'about 1910',
      alt: 'Men standing, walking and sitting on the pavement outside small shops, under shop signs and a street light.',
      note: 'A printed postcard, the picture side only; the back is left out. The archive dates it to about 1910 and does not give the street.',
      credit: CVA,
      ref: 'AM1052 P-239',
      recordUrl: record('in-chinatown-vancouver-b-c'),
      sourceId: 'cva-am1052-p-239',
    },
    {
      file: 'chapter-3/japanese-language-school-c1929_cva-99-2468.jpg',
      title: 'Nippon Kyoritsu Go-Gakko, the Japanese Language School, 439 Alexander Street',
      date: 'about 1929',
      alt: 'A two-storey wooden school with a steep gable and an outside stair, behind a board fence and a street lamp.',
      note: 'Taken some twenty years after this card\'s date; the school stands a few blocks from Powell Street, in the neighbourhood the card names.',
      credit: CVA,
      ref: 'CVA 99-2468',
      recordUrl: record(
        'nippon-kyoritsu-go-gakko-school-also-known-as-vancouver-kyoritsu-nippon-kokumin-gakkou-and-vancouver-japanese-language-school-439-alexander-street-vancouver',
      ),
      sourceId: 'cva-99-2468',
    },
  ],
  riot: [
    {
      file: 'chapter-3/chinatown-riot-damage-1907_vpl-940.jpg',
      title: 'Boarded-up buildings in Chinatown after race riots, Carrall Street',
      date: '1907',
      alt: 'A four-storey brick corner block with its ground-floor windows boarded and awnings hanging loose; three men stand on the plank footpath, a group sits by a doorway at the left, and a sign reads Pekin Restaurant.',
      note: 'By Philip Timms, from Vancouver Public Library, which gives it as having no known copyright restrictions. The City archives hold no photograph of the damage that could be found. The men are not named.',
      credit: 'Vancouver Public Library, Philip Timms',
      ref: 'VPL 940',
      recordUrl: 'https://commons.wikimedia.org/wiki/File:Chinatown_riot_VPL_940_(10463603965).jpg',
      sourceId: 'vpl-940',
    },
  ],
  exclusion: [
    {
      file: 'chapter-3/pender-street-chinatown-191x_cva-789-46.jpg',
      title: 'Pender Street in Chinatown',
      date: '1910s',
      alt: 'Two brick blocks with shopfronts and a balconied restaurant with a tall Chinese-lettered sign, two men on the footpath and mounds of earth in the street.',
      note: 'Taken before the Act. The archive names the Yucho Chow Photograph Supply House, Canadian Scharlin Bros. and the Kwong Wing Barber Shop, and dates it only to the 1910s.',
      credit: CVA,
      ref: 'CVA 789-46',
      recordUrl: record('pender-street-in-chinatown'),
      sourceId: 'cva-789-46',
    },
  ],
  relief: [
    {
      file: 'chapter-3/may-day-powell-grounds-c1932_cva-99-2642.jpg',
      title: 'May Day demonstration crowds at Powell Street Grounds',
      date: 'about 1932',
      alt: 'Seen from above, a dense crowd of men in hats gathered on the open dirt of the grounds, with houses and a brick church behind.',
      note: 'The archive dates it to about 1932.',
      credit: CVA,
      ref: 'CVA 99-2642',
      recordUrl: record('may-day-demonstration-crowds-at-powell-street-grounds'),
      sourceId: 'cva-99-2642',
    },
    {
      file: 'chapter-3/strikers-city-museum-1935_re-p7.jpg',
      title: 'Food is hauled up in a bucket to relief camp strikers who took possession of the City Museum',
      date: '1935',
      alt: 'The stone front of a building seen from below, a bucket on a rope hanging beside an arched window, a man at the roofline.',
      note: 'The strikers occupied the museum in the Carnegie Library on 19 May 1935.',
      credit: CVA,
      ref: 'Re P7',
      recordUrl: record('food-is-hauled-up-in-bucket-to-relief-camp-strikers-who-took-possession-of-city-museum'),
      sourceId: 'cva-re-p7',
    },
    {
      file: 'chapter-3/mounted-police-powell-street-riot-1935_cva-371-1130.jpg',
      title: 'Mounted police during the Powell Street Riot',
      date: '1935',
      alt: 'Mounted police riding down a street past parked cars, one riderless horse running at the left, the picture blurred by movement.',
      note: 'The archive\'s own title, with the date given only as 1935; its record says no more of the event.',
      credit: CVA,
      ref: 'CVA 371-1130',
      recordUrl: record('mounted-police-during-powell-street-riot'),
      sourceId: 'cva-371-1130',
    },
  ],
  uprooting: [
    {
      file: 'chapter-3/train-window-1942_cva-1184-13.jpg',
      title: 'Japanese Canadian men shaking hands through a train window',
      date: '25 February 1942',
      alt: 'At night, two men in hats on the platform reach up to shake the hands of men leaning out of a train window.',
      note: 'The archive dates it to the day after the removals began and gives no place.',
      credit: CVA,
      ref: 'CVA 1184-13',
      recordUrl: record('japanese-canadian-men-shaking-hands-through-train-window'),
      sourceId: 'cva-1184-13',
    },
    {
      file: 'chapter-3/uchida-store-1942_cva-1184-1534.jpg',
      title: 'Uchida Stationery Store, 347 Powell Street, boarded up',
      date: 'December 1942',
      alt: 'A shop entrance, its window boarded, a for-rent sign on the glass behind it and the name Uchida in Japanese characters on the door.',
      note: 'The archive describes a for-rent sign and a Wartime Prices and Trade Board licence notice in the windows.',
      credit: CVA,
      ref: 'CVA 1184-1534',
      recordUrl: record('uchida-stationary-store-347-powell-street-boarded-up'),
      sourceId: 'cva-1184-1534',
    },
  ],
}
