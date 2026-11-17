/**
 * Archival photographs for the cards of chapter 2, by stop id. Each is checked against its
 * City of Vancouver Archives record, where it is marked "Copyright status: Public domain".
 * Kept apart from chapterTwo.ts so that the photographs can change without touching the map.
 */
import type { Photo } from './stops'

const CVA = 'City of Vancouver Archives'
const record = (slug: string) => `https://searcharchives.vancouver.ca/${slug}`

export const chapterTwoPhotos: Record<string, Photo[]> = {
  hastings: [
    {
      file: 'chapter-2/carnegie-library-construction-1902_cva-1376-27.jpg',
      title: 'Carnegie Library under construction',
      date: '1902',
      alt: 'A sandstone building with arched windows, its columned entrance still in scaffolding, workmen on the roof and a man standing in the street.',
      note: 'The library at Main and Hastings, a year before it opens.',
      credit: CVA,
      ref: 'CVA 1376-27',
      recordUrl: record('carnegie-library-under-construction'),
      sourceId: 'cva-1376-27',
    },
    {
      file: 'chapter-2/hastings-west-from-carrall-c1907_str-p283.jpg',
      title: 'Hastings Street looking west from Carrall Street',
      date: 'about 1907',
      alt: 'A street of brick blocks under tall telegraph poles, a horse and cart and people on the sidewalk; a sign on the right reads Palace.',
      note: 'A few years after the card\'s date, toward Woodward\'s; the archive gives the date only as about 1907.',
      credit: CVA,
      ref: 'Str P283',
      recordUrl: record('hastings-street-looking-west-from-carrall-street'),
      sourceId: 'cva-str-p283',
    },
  ],
  hotels: [
    {
      file: 'chapter-2/europe-hotel-191x_m-11-32.jpg',
      title: 'Europe Hotel',
      date: '1910s',
      alt: 'A six-storey flatiron hotel on a narrow corner, with bay windows up its rounded end and a flag on the roof.',
      note: 'Built 1908 to 1909 and an SRO hotel today. The archive dates the photograph only to the 1910s.',
      credit: CVA,
      ref: 'M-11-32',
      recordUrl: record('europe-hotel'),
      sourceId: 'cva-m-11-32',
    },
  ],
  travellers: [
    {
      file: 'chapter-2/second-cpr-station-c1899_can-p117-1.jpg',
      title: 'The second C.P.R. station at the foot of Granville Street',
      date: 'about 1899',
      alt: 'A large turreted station building with a wide arched entrance at the end of a broad street, mountains behind.',
      credit: CVA,
      ref: 'Can P117.1',
      recordUrl: record('second-c-p-r-station-at-foot-of-granville-street-7'),
      sourceId: 'cva-can-p117-1',
    },
    {
      file: 'chapter-2/hotel-bus-cpr-station-c1909_trans-p149-03.jpg',
      title: 'A horse-drawn hotel bus at the C.P.R. station',
      date: 'about 1909',
      alt: 'A coach drawn by four horses with a uniformed driver on top, beside railway cars marked Canadian.',
      note: 'Hotels sent buses to meet the trains and boats. The archive does not say which hotel this one served.',
      credit: CVA,
      ref: 'Trans P149.03',
      recordUrl: record('horse-drawn-hotel-bus-at-c-p-r-station'),
      sourceId: 'cva-trans-p149-03',
    },
    {
      file: 'chapter-2/dominion-hotel-bus-c1909_trans-p149-01.jpg',
      title: 'The Dominion Hotel bus',
      date: 'about 1909',
      alt: 'Four people standing in front of a motor bus lettered Dominion, outside the hotel, whose name is painted on the building behind.',
      note: 'The Dominion, built 1900 to 1901, is an SRO hotel today.',
      credit: CVA,
      ref: 'Trans P149.01',
      recordUrl: record('dominion-hotel-bus'),
      sourceId: 'cva-trans-p149-01',
    },
  ],
  interurban: [
    {
      file: 'chapter-2/bc-electric-depot-c1913_am1052-p-206.jpg',
      title: 'B.C. Electric Passenger Depot, Vancouver',
      date: 'about 1913',
      alt: 'A printed postcard view of a six-storey stone building on a corner, crowds on the sidewalk, streetcar tracks curving into an open bay at the right.',
      note: 'A postcard, the picture side only; the view is retouched, not a plain photograph. The back carries a private message and is left out.',
      credit: CVA,
      ref: 'AM1052 P-206',
      recordUrl: record('b-c-electric-passenger-depot-vancouver-b-c'),
      sourceId: 'cva-am1052-p-206',
    },
  ],
  peak: [
    {
      file: 'chapter-2/hastings-west-from-main-1912_sgn-1535.jpg',
      title: 'Hastings Street looking west from Main Street',
      date: 'probably 1912',
      alt: 'A paved street between brick and stone blocks of four to eight storeys, ornate lamp standards, a streetcar in the distance; a sign on the left reads Hotel Regent.',
      note: 'The archive dates it "1912?".',
      credit: CVA,
      ref: 'SGN 1535',
      recordUrl: record('view-of-hastings-street-looking-west-from-main-street'),
      sourceId: 'cva-sgn-1535',
    },
    {
      file: 'chapter-2/hastings-west-from-carrall-1912_sgn-1533.jpg',
      title: 'Hastings Street looking west from Carrall Street',
      date: 'probably 1912',
      alt: 'People crossing a wide intersection between a stone building with a tall arched entrance on the left and a domed corner block on the right.',
      note: 'The archive dates it "1912?".',
      credit: CVA,
      ref: 'SGN 1533',
      recordUrl: record('view-of-hastings-street-looking-west-from-carrall-street'),
      sourceId: 'cva-sgn-1533',
    },
  ],
  bust: [
    {
      file: 'chapter-2/jungle-of-unemployed-1931_re-n10-01.jpg',
      title: 'The "Jungle" of the unemployed',
      date: 'summer 1931',
      alt: 'Makeshift shelters of canvas and boards in long grass, washing hung on a line, sheds and mountains behind.',
      note: 'On the site of the old Hastings Mill and the railway land east of Dunlevy. Matthews notes it began with 14 men and grew to 240.',
      credit: CVA,
      ref: 'Re N10.01',
      recordUrl: record('jungle-of-unemployed-summer-of-1931'),
      sourceId: 'cva-re-n10-01',
    },
  ],
}
