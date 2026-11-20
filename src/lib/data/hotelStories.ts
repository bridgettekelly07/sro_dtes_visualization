/**
 * The hotels' side stories, by the id of the card each is followed from. Every step is from the page its
 * `sourceId` names, read on 20 November 2026 by a research pass and not re-read line by line since; where
 * the pages disagree or say nothing, the story's note says so. The Europe's story is with its card in
 * chapterTwo.ts, since it draws more than the others.
 */
import type { SideStory, StoryScene } from './stops'
import { landmarkPick, pickOf, story } from './sideStories'

const S = (year: number, kicker: string, title: string, text: string | string[], sourceId: string, scene?: StoryScene) => ({ year, kicker, title, text: Array.isArray(text) ? text : [text], sourceId, scene })

// places the stories point to
const WINTERS: [number, number] = [-123.106225, 49.283558]
const TAWOW: [number, number] = [-123.10251, 49.28208]
// the middle of the block behind the Del Mar, about 40 m back from Hamilton Street: placed by judgement
const HYDRO_BLOCK = { lon: -123.11272, lat: 49.28188 }

export const hotelStories: Record<string, SideStory[]> = {
  // ---- chapter 2
  hastings: [
    story(pickOf("DANNY'S INN/ROOMS"), {
      label: 'Follow one building: the Horne Block',
      built: 1890,
      steps: [
        S(1890, '1890', 'The Horne Block', 'Four years after the fire, a three-storey brick block in the Italianate style goes up on Cambie Street to the design of N. S. Hoffar. It is named for J. W. Horne, a real estate promoter and politician.', 'crhp-horne', { name: 'Horne Block' }),
        S(1892, '1892 to 1896', 'Banks and brokers', 'Its first tenants are of the city that is moving this way: the Bank of North America in 1892, Rand Brothers real estate in 1896.', 'crhp-horne'),
        S(1930, '1930s to 1950s', 'Books, clothes, cleaners', 'By the middle of the century the shops at the street are bookstores, clothing retailers and cleaners.', 'crhp-horne'),
        S(2003, '2003', 'Designated', 'The City designates the block as heritage on 14 January 2003. The register gives one of its uses today as a hotel or inn.', 'crhp-horne'),
      ],
      note: "The register's entry for 313 to 325 Cambie is the Horne Block of 1890 and does not mention Danny's Inn; that the rooms of that name on the City's list are upstairs in this building is taken from the address alone. The property record dates the lot to 1901, the register the building to 1890: the register is followed. When the upper floors became rooms, and who owns them, is not on the pages read.",
    }),
  ],
  hotels: [
    story(pickOf('DOMINION HOTEL'), {
      label: 'Follow one hotel: the Dominion',
      built: 1901,
      steps: [
        S(1901, '1900 to 1901', 'The Sherdahl Block', 'The merchant Swain Sherdahl builds a hotel over a department store at Abbott and Water streets, to the design of Emil Guenther. It lodges the men of the seasonal trades, fishing and logging.', 'crhp-dominion', { name: 'Sherdahl Block' }),
        S(1904, '1904', 'Rooms over a department store', 'A photograph of 1904 shows Rubinowitz Departmental Stores on the corner, with the Hotel Dominion alongside.', 'hsf-dominion', { name: 'Hotel Dominion' }),
        S(1925, '1925', 'The Lamplighter', "The Lamplighter takes the ground floor, on what the Gastown business association calls the city's first pub licence.", 'gastown-dominion', { name: 'Dominion Hotel, over the Lamplighter' }),
        S(2003, '2003', 'Designated', 'The City designates the building as heritage on 14 January 2003.', 'crhp-dominion'),
      ],
      note: 'Nothing on the pages read says who has owned the hotel since Sherdahl, what has happened to it between 1925 and 2003, or who runs its rooms now; the 2024 survey lists it with 63 rooms, owned by government and run by a non-profit.',
    }),
  ],
  interurban: [
    story(pickOf('PENNSYLVANIA HOTEL'), {
      label: 'Follow one hotel: the Pennsylvania',
      built: 1906,
      steps: [
        S(1906, '1906', 'The Woods Hotel', 'J. S. and Eliza Woods build a hotel at Carrall and Hastings to the design of W. T. Whiteway, with a turret on its corner. It is meant for the better-off traveller and the business visitor.', 'crhp-pennsylvania', { name: 'Woods Hotel' }),
        S(1991, '1991', 'The first Portland Hotel', 'By now a rundown rooming hotel, it becomes the founding project of the Portland Hotel Society, which houses people other housing has turned away.', 'phs-pennsylvania', { name: 'Portland Hotel' }),
        S(2003, '2003', 'Designated', 'The City designates the building as heritage on 14 January 2003.', 'crhp-pennsylvania'),
        S(2009, '7 January 2009', 'Reopened', 'After a restoration costing $14 million, managed by the Society with the Province as the largest funder, it reopens as 44 studio apartments with support on site. Its neon sign has been remade.', 'tyee-pennsylvania-2009', { name: 'Pennsylvania Hotel' }),
      ],
      note: 'When the Woods became the Pennsylvania is not on the pages read, nor the years between 1906 and 1991; The Tyee says it was also once the Rainbow Hotel. That it was rundown by 1991 is the sense of the pages, not a quoted finding. The turret on the model is drawn from the 2011 photograph.',
    }),
  ],
  // ---- chapter 3
  neighbours: [
    story(pickOf('UNITED ROOMS'), {
      label: 'Follow one rooming house: United Rooms',
      built: 1912,
      steps: [
        S(1912, 'About 1912', 'The Harbour Rooms', 'A narrow four-storey building goes up on East Cordova, rooms above and a shop below: lodging of the kind the working men of the resource trades moved through.', 'hsf-united', { name: 'Harbour Rooms' }),
        S(1925, '1925 to 1950', 'United Rooms', 'Some time in these years it takes the name it still has.', 'hsf-united', { name: 'United Rooms' }),
        S(2024, '2024', 'Still rooms', 'The 2024 survey lists it with 32 rooms, privately owned and rented on the market.', 'sro-tenant-survey-2024'),
        S(2026, '2026', 'Changing hands', "In February 2026 the building passes to new owners, and The Tyee reports creditors beginning foreclosure against it. The neighbourhood's SRO Collaborative says it is worried for the tenants.", 'tyee-sros-hands-2026'),
      ],
      note: 'The year it became United Rooms is given only as a range. Its builder and architect are not recorded on the pages read. The slider stops at 2024; the last step is of 2026.',
    }),
  ],
  uprooting: [
    story(pickOf('HAMPTON HOTEL'), {
      label: 'Follow one hotel: the Hampton',
      built: 1912,
      steps: [
        S(1910, '1910', 'A by-law for lodging houses', "The City's Lodging House By-law sets what such a building must have: small rooms, each with light and air, and shared washing. The Hampton will be laid out to it.", 'heritageguide-hampton'),
        S(1912, '1912', 'The Hampton Rooms', 'The architect and businessman Edgar Baynes designs, builds and owns a three-storey rooming house on Powell Street, in brick from Port Haney, for the single Japanese men arriving to work.', 'heritageguide-hampton', { name: 'Hampton Rooms', places: [{ label: 'Powell Street Grounds', lon: -123.0943, lat: 49.2829, stem: 10 }] }),
        S(1986, '23 September 1986', 'On the heritage register', "The building is recognized on the City's heritage register. Its rooms keep much of their first layout.", 'heritageguide-hampton'),
        S(2024, '2024', 'Still rooms', 'The 2024 survey lists it with 52 rooms, owned and run by a non-profit as non-market housing. The heritage pages say a mental patients association has used the rooms for housing.', 'sro-tenant-survey-2024'),
      ],
      note: 'This story sits on the card of the 1942 uprooting because the hotel stands in the neighbourhood that was emptied, and was built for its men. But nothing on the pages read says who lived in it in 1942, whether any of it was owned or run by Japanese Canadians, or what became of it then. That gap is the most important thing still to find.',
    }),
  ],
  // ---- chapter 4
  'skid-road': [
    story(pickOf('HILDON HOTEL'), {
      label: 'Follow one hotel: the Manitoba, later the Hildon',
      built: 1909,
      steps: [
        S(1909, '1909', 'The Hotel Manitoba', 'A six-storey hotel by W. T. Whiteway opens on West Cordova: cheap rooms for working men and lodging for travellers, over shops.', 'crhp-manitoba', { name: 'Hotel Manitoba' }),
        S(1954, '1954', 'The Hildon', 'It is the Hotel Manitoba until 1954, and the Hildon after. The name changes in the years the city is calling these blocks Skid Road.', 'crhp-manitoba', { name: 'Hildon Hotel' }),
        S(2003, '2003', 'Designated', 'The City designates the building as heritage on 14 January 2003. Its upper floors are still housing, and there are still shops at the street.', 'crhp-manitoba'),
        S(2024, '2024', 'Still rooms', 'The 2024 survey lists it with 95 rooms, privately owned and rented on the market.', 'sro-tenant-survey-2024'),
      ],
      note: "The register does not say why the name changed in 1954, who has owned the hotel, or what has been done to it; linking the change to the Skid Road years is this card's reading, not the register's. The property record dates the lot to 1910; the register's 1909 is followed.",
    }),
  ],
  viaducts: [
    story(pickOf('IVANHOE HOTEL'), {
      label: 'Follow one hotel: the Ivanhoe',
      built: 1910,
      steps: [
        S(1910, '1910', 'The VanDecar Hotel', 'The city directory first lists a hotel here in 1910, managed by Herbert VanDecar, at 1038 Westminster Avenue: the street that will be renamed Main.', 'cv-ivanhoe', { name: 'VanDecar Hotel' }),
        S(1913, '1913', 'The Hotel Cunningham', 'Under a new owner, Samuel Cunningham, it takes his name.', 'cv-ivanhoe', { name: 'Hotel Cunningham' }),
        S(1920, 'By 1920', 'The Ivanhoe', 'By 1920 it is the Ivanhoe, run by J. G. Scott.', 'cv-ivanhoe', { name: 'Ivanhoe Hotel' }),
        S(2024, 'Today', 'Hostel, rooms and a pub', 'It holds a backpacker hostel, rooms let long-term and a pub at the street. The 2024 survey lists 92 rooms, privately owned and rented on the market.', 'hsf-ivanhoe'),
      ],
      note: "The early names and dates are from one local-history site, Changing Vancouver, reading the city directories; the Heritage Foundation's page says the year it was built is not known. Its architect is uncertain. Nothing on the pages read is about the viaducts: the story sits here because the hotel stands at their foot.",
    }),
  ],
  // ---- chapter 5
  expo: [
    story(pickOf('DEL MAR HOTEL'), {
      label: 'Follow one hotel: the Del Mar',
      built: 1912,
      steps: [
        S(1912, '1912', 'The Cadillac Hotel', 'W. P. White designs and builds a hotel of 26 rooms on Hamilton Street for A. E. Hansen, at a cost of $33,000.', 'ptm-delmar', { name: 'Cadillac Hotel' }),
        S(1944, '1944', 'The Coast, then the Del Mar', 'It is renamed the Coast in 1944, and later the Del Mar.', 'tyee-delmar-2024', { name: 'Coast Hotel' }),
        S(1972, '1972', 'George Riste buys it', 'George Riste buys the hotel and keeps its rooms cheap.', 'ptm-delmar', { name: 'Del Mar Hotel' }),
        S(1981, '1980s', 'Not for sale', 'BC Hydro wants most of the block for two office towers. The hotels beside the Del Mar are sold and pulled down. Riste is asked, by his own count, more than a hundred times, and refuses.', 'tyee-delmar-2024', { places: [{ label: "BC Hydro's block: the neighbours sold and pulled down", ...HYDRO_BLOCK, stem: 10 }] }),
        S(1990, '1990', 'Unlimited growth increases the divide', 'Council turns down the extra floor space Hydro asks for, and only one tower is built. The artist Kathryn Walter, working with Riste, sets a line of copper letters across the front of the hotel.', 'ptm-delmar', { places: [{ label: "BC Hydro's one tower", ...HYDRO_BLOCK, stem: 22 }] }),
        S(2010, '2010 to today', 'Still in the family', 'Riste dies in 2010 at 89; his will says the building is not to be sold. His family still owns it and runs it as rooms, at a loss.', 'tyee-delmar-2024'),
      ],
      note: "The Tyee gives 1973 for Riste's purchase, the Heritage Foundation 1972. The refusals are dated only to the 1980s; the slider puts them at 1981 for want of a year. The Del Mar is outside the fair's grounds and its story is not about the fair: it sits on this card as the same decade's pressure on the same kind of building.",
    }),
  ],
  evictions: [
    story(pickOf('PATRICIA HOTEL'), {
      label: 'Follow one hotel: the Patricia',
      built: 1913,
      face: 180,
      steps: [
        S(1913, '1913', 'A dollar a day', 'The Patricia is finished in 1913, its rooms a dollar a day. There is boxing in the basement, and jazz upstairs: Jelly Roll Morton is among those who play.', 'vnt-patricia'),
        S(1986, '1986', 'Room 338', "Olaf Solheim, a retired logger of 86, has lived in room 338 for sixty years. Before the fair he is put out with less than eight hours' notice. He dies on 21 April, within six weeks; the medical health officer rules that the eviction caused it.", 'ch-skidrow', { leaving: 12 }),
        S(2021, '1 April 2021', 'The Province buys it', 'The Province buys the hotel, 195 rooms and its parking lot, for $63.8 million, to open about a hundred homes at first.', 'bcgov-patricia-2021'),
        S(2023, '2023', 'Without an operator', 'Atira, which has run it for BC Housing for about two years, gives notice that it will withdraw in November, citing a shortfall in funding and a building 110 years old.', 'atira-patricia-2023'),
      ],
      note: "The 1913 details are from a local-history site, Vancouver Now and Then. Solheim's story is from Canada's History magazine, which gives 500 to 600 long-term tenants evicted from the downtown hotels; the date of his death and the ruling are from an article by Jean Swanson in The Volcano. The main card's 700 to 1,000 is Olds's estimate, unread here, so the two counts stand side by side. Who runs the Patricia now is not on the pages read. Its model is its footprint with floors and windows drawn by rule.",
    }),
  ],
  // ---- chapter 6
  'sra-bylaw': [
    story(pickOf('MURRAY HOTEL'), {
      label: 'Follow one hotel: the Murray',
      built: 1915,
      steps: [
        S(1915, '1912 to 1915', 'Fred Murray builds', 'The contractor Fred Murray builds a hotel for himself on Hornby Street to the design of E. E. Workman, its brick front under round arches.', 'hsf-murray'),
        S(1919, '1919', 'Leased to the Mounted Police', 'The hotel is leased to the Royal North West Mounted Police. A local-history site says it had stood empty through the war and became a barracks, with stables on the main floor.', 'hsf-murray', { name: 'Mounted Police barracks' }),
        S(2003, '2003', 'Designated single room accommodation', 'The new by-law lists it. From now on its rooms cannot be converted or demolished without a permit from council.', 'hsf-murray', { name: 'Murray Hotel' }),
        S(2017, '2017', 'The front restored', 'The front is restored by the developers of the tower built next door.', 'vnt-murray'),
      ],
      note: 'The barracks, the stables and the 2017 restoration are from one local-history site, Vancouver Now and Then. Who owns and runs the hotel now is not on the pages read; the 2024 survey lists 95 rooms, privately owned, run by a non-profit and rented on the market. The building is drawn from 1915, the year both pages agree it was finished.',
    }),
  ],
  // ---- chapter 7
  'province-buys': [
    story(pickOf("ST. HELEN'S HOTEL"), {
      label: "Follow one hotel: the St. Helen's",
      built: 1911,
      steps: [
        S(1911, '1911', 'Parr and Fee on Granville', 'The architects Parr and Fee, who drew many of the boom hotels, design another on Granville Street.', 'hsf-sthelens'),
        S(2007, '2007', 'Bought by the Province', 'It is one of the hotels the Province buys this year. Coast Mental Health is named to run it.', 'tyee-sthelens-2024'),
        S(2008, '2008 to 2010', 'Renovated', 'It is renovated at a cost of $6.7 million.', 'hsf-sthelens'),
        S(2022, '16 February 2022', 'The operator leaves', 'Coast Mental Health ends its contract. Atira Property Management runs the building, 93 rooms, for BC Housing. In 2024 The Tyee reports tenants describing filth and violence there.', 'tyee-sthelens-2024'),
      ],
      note: "That the St. Helen's is one of the ten bought in 2007 is from the mayor's bulletin on the main card; the Province's own releases read here do not name it. Its first owner and use are not on the pages read.",
    }),
  ],
  'balmoral-regent': [
    story(landmarkPick('balmoral', 'Balmoral Hotel', '159 East Hastings Street', '1911 to 1912, by the heritage register'), {
      label: 'Follow one hotel: the Balmoral',
      built: 1912,
      gone: 2023,
      face: 180,
      steps: [
        S(1912, 'September 1912', 'A hotel for the well-off', 'The Balmoral opens on Hastings, designed by Parr and Fee for businessmen and wealthy travellers.', 'crhp-balmoral'),
        S(1994, '1994', 'On the heritage register', "It is recognized on the City's heritage register on 21 November 1994.", 'crhp-balmoral'),
        S(2017, '2017', 'Emptied', 'After years in the hands of the Sahota family, who have bought and held hotels here since the 1970s, the City orders it closed as unsafe.', 'tyee-balmoral-regent-2019', { leaving: 14 }),
        S(2019, '15 November 2019', 'Expropriated for a dollar', 'Council votes to expropriate it for $1. A settlement a year later brings it into public ownership.', 'tyee-balmoral-regent-2019'),
        S(2022, '2022', 'Ordered down', 'With its floors rotten and fire a risk, demolition is ordered in February. Work begins in November and is expected to take ten to twelve months.', 'global-balmoral-demolition-2022'),
      ],
      note: "The pages disagree on when the demolition finished (2024 or 2025); the building is drawn gone from 2023, when the work was under way. What the settlement cost is reported differently in different places and is left out. A 2025 report says the lot is to be a temporary healing and wellness space; only its headline was read.",
    }),
    story(landmarkPick('regent', 'Regent Hotel', '160 East Hastings Street', '1913, by the Vancouver Heritage Foundation'), {
      label: 'Follow one hotel: the Regent',
      built: 1913,
      face: 0,
      steps: [
        S(1913, '1913', 'Built for Art Clemes', 'Emil Guenther designs a hotel for travellers on a steel frame, for Art Clemes. Its brochure promises 160 rooms.', 'hsf-regent'),
        S(1989, '1989', 'The Sahotas buy it', 'The Sahota family buys the Regent for $1.5 million.', 'tyee-balmoral-regent-2019'),
        S(2018, 'June 2018', 'Shut', 'After more than a thousand by-law violations under its owners, the City shuts the hotel at the end of June.', 'global-regent-2025', { leaving: 14 }),
        S(2020, '2019 to 2020', 'Into public hands', 'Council votes to expropriate it in November 2019; title passes to the City a year later.', 'straight-settlement-2020'),
        S(2023, '2023 to today', 'Empty, and waiting', 'The City leases it to BC Housing, which has been taking out hazardous materials since August 2023 and plans self-contained suites. At the start of 2025 there is no timeline for the work.', 'global-regent-2025'),
      ],
      note: "The 160 rooms are from a local historian's site quoting the 1913 brochure. No start date for the renovation is on a page read. The model is the footprint picked for the address, with floors and windows drawn by rule.",
    }),
  ],
  'winters-fire': [
    story(landmarkPick('winters', 'Winters Hotel', '203 Abbott Street at Water Street', '1907, by the heritage register'), {
      label: 'Follow one hotel: the Winters',
      built: 1907,
      gone: 2022,
      face: 270,
      steps: [
        S(1907, '1907', 'Built for Alice Winters', 'William Frederick Winters has a hotel built at Abbott and Water for his wife Alice, to the design of W. T. Whiteway.', 'gastown-winters'),
        S(1917, '1917 to 1921', 'The bar closes, and reopens', 'Prohibition shuts its bar in 1917. It reopens in 1921.', 'gastown-winters'),
        S(2003, '2003', 'Designated', 'The City designates the building as heritage on 14 January 2003.', 'crhp-winters'),
        S(2022, '11 April 2022', 'The fire', 'A fire three days earlier has left the sprinklers and extinguishers out of service. On 11 April the hotel burns. Mary Ann Garlow and Dennis Guay die in it, and the building is pulled down.', 'hv-winters', { burn: true, leaving: 14, path: [WINTERS, TAWOW], places: [{ label: 'Tawow, the old Columbia Hotel: where tenants were moved', lon: TAWOW[0], lat: TAWOW[1], stem: 14 }] }),
        S(2024, '2024', 'The inquest', "A coroner's inquest opens on 22 January. On 8 February its jury makes 25 recommendations, among them that BC Housing stop funding privately owned SROs.", 'tyee-winters-inquest-2024'),
      ],
      note: "Heritage Vancouver counts 143 people displaced by the fire; the Global News page on the main card says 140. Mary Ann Garlow's age is given as 63 by Global News and 68 by The Tyee, and is left out. The pages also differ on whether Atira owned the building or leased it. The building is drawn gone from 2022; the day it was pulled down is not on a page read.",
    }),
  ],
  // ---- chapter 8
  'who-owns': [
    story(pickOf('NEW COLUMBIA (TAWOW)'), {
      label: 'Follow one hotel: the Columbia, now Tawow',
      built: 1910,
      steps: [
        S(1910, '1910 to 1920', 'The first three storeys', 'The Columbia is built in two stages: first a three-storey block on the south, some time in this decade. It lodges loggers between jobs, and its beer parlour is where they meet.', 'crhp-newcolumbia', { name: 'Columbia Hotel' }),
        S(1925, '1925 to 1950', 'Six storeys more', 'A six-storey block is added on the north.', 'crhp-newcolumbia'),
        S(1990, '1990s', 'A tourist hotel', 'Like other hotels in Gastown, it is turned to the tourist trade.', 'crhp-newcolumbia', { name: 'New Columbia Hotel' }),
        S(2022, '2022', 'Tawow', "The Atira Women's Resource Society buys it early in 2022. In April, days after the Winters Hotel fire, the Province and Atira open it as 70 homes, and people burned out of the Winters move in. Tawow is a Cree word for welcome, or there is room.", 'bcgov-tawow-2022', { name: 'Tawow', path: [WINTERS, TAWOW], places: [{ label: 'Winters Hotel, burned 11 April 2022', lon: WINTERS[0], lat: WINTERS[1], stem: 18 }] }),
        S(2023, 'November 2022', 'Not yet safe', 'The Tyee reports that the renovations are unfinished, that the building does not yet meet the fire code, and that five tenants have died in five months.', 'tyee-winters-tenants-2022'),
      ],
      note: 'The register gives only ranges for the two stages and names no builder; the whole building is drawn from 1910, since the project has no separate outline for each stage. The meaning of Tawow is from Global News. The 2024 survey lists 78 rooms, owned by a non-profit. The last step is of November 2022, placed at 2023 on the slider to follow the one before.',
    }),
  ],
  'state-of-repair': [
    story(pickOf('REGAL HOTEL'), {
      label: 'Follow one hotel: the Regal',
      built: 1910,
      steps: [
        S(1910, '1910', 'The Albany Rooms', 'Peter Tardiff builds a rooming hotel on Granville for W. A. Clark, at about $50,000, to a Parr and Fee design much like their others.', 'hsf-regal', { name: 'Albany Rooms' }),
        S(2018, '2018', 'One way out', 'A City inspector finds the building has one working exit. The by-law requires two.', 'tyee-regal-2021', { name: 'Regal Hotel' }),
        S(2019, '2019', 'A fine', 'An inspector finds structural damage in the second floor. The owners, the brothers Gurdyal and Pal Sahota, pay a $150,000 fine in a settlement with the City.', 'tyee-regal-2021'),
        S(2021, 'September 2021', 'Still one exit', 'With the second exit still not built in a building of 82 rooms, City staff ask council for a court injunction and a notice on its title.', 'tyee-regal-2021'),
      ],
      note: "Nothing on the pages read says who owned the hotel between 1910 and the Sahotas, or what has happened since 2021. The 2024 survey lists 59 rooms, privately owned and rented on the market; The Tyee's 82 is its own count.",
    }),
  ],
}
