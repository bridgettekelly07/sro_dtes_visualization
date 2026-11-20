import type {
  Agency,
  Chapter,
  ChapterEvent,
  FactionId,
  Jurisdiction,
  LayerId,
} from './types'
import type { SourceId } from './sources'
import { eventChoices } from './choices'

/**
 * Shorthand for an event that has not been checked yet.
 * `check` lists the sources to verify it against. Once confirmed, add a
 * locator to the citation and set `verified: true` on the event.
 * `effects` start empty: they are game tuning, added once the simulation exists.
 * Recommendations are merged in from choices.ts.
 * A verified event passes its own `citations`, with locators, and `verified: true` in `extra`.
 */
function draft(
  id: string,
  year: number,
  title: string,
  summary: string,
  jurisdiction: Jurisdiction,
  agency: Agency,
  check: SourceId[],
  extra: Partial<Pick<ChapterEvent, 'endYear' | 'effects' | 'choices' | 'historicalChoiceId' | 'historicalChoiceVerified' | 'citations' | 'verified'>> = {},
): ChapterEvent {
  return {
    id,
    year,
    title,
    summary,
    jurisdiction,
    agency,
    effects: [],
    citations: check.map((sourceId) => ({ sourceId })),
    verified: false,
    // Recommendations live in choices.ts, keyed by event id. Events the office
    // cannot act on get none, even if drafts for them are shelved there.
    ...(agency === 'none' ? {} : eventChoices[id]),
    ...extra,
  }
}

const layers = (...ids: LayerId[]) => ids
const factions = (...ids: FactionId[]) => ids

/** Office titles are placeholders until the city's planning history is checked. */
const office = (title: string) => ({ title, verified: false })

export const chapters: Chapter[] = [
  {
    id: 'mill-and-terminus',
    index: 1,
    title: 'Mill and terminus',
    period: { start: 1865, end: 1887 },
    summary:
      'A sawmill, a saloon and a railway terminus establish the original centre of Vancouver on the south shore of Burrard Inlet.',
    sroThread:
      'No purpose-built rooming hotels yet. The area fills with a transient male workforce that will need them.',
    office: null,
    factions: [],
    body: [
      { text: 'In 1865 Captain Edward Stamp forms a company to cut lumber on the south shore of Burrard Inlet, and by June 1867 his mill is cutting for export. Its hands walk about five hours to New Westminster for a drink. That September John "Gassy Jack" Deighton paddles over with a barrel of whisky and opens a saloon beside the mill. The settlement that grows around it takes his nickname: Gastown.' },
      { text: 'Vancouver is incorporated on 6 April 1886. Two months later, on 13 June, a clearing fire burns it to the ground. The city rebuilds, and on 23 May 1887 the first Canadian Pacific Railway train arrives, the company having extended its line west from Port Moody.' },
      { text: 'None of the rooming hotels exist yet. What exists is the reason for them: a town of mills, docks and rail, worked by men who come and go with the seasons.', needsSource: true },
    ],
    layers: layers('shoreline-historic', 'rail-and-streetcar'),
    events: [
      draft('hastings-mill', 1865, 'Hastings Mill founded', 'Captain Edward Stamp forms a company in 1865 to produce lumber on Burrard Inlet. Stamp\'s Mill, later Hastings Mill, begins cutting for export in June 1867. It is the first commercial operation around which the settlement grows.', 'market', 'none', [], {
        endYear: 1867,
        verified: true,
        citations: [
          { sourceId: 'wiki-hastings-mill', note: 'Explains the two dates in circulation: the company dates from 1865, the first cutting from 1867.' },
          { sourceId: 'mcdonald-making-vancouver', locator: 'p. 7', note: 'Cited by the Wikipedia article for these dates. Not yet read directly.' },
        ],
      }),
      draft('gastown', 1867, 'Gastown begins', 'John "Gassy Jack" Deighton opens a saloon beside the Burrard Inlet sawmill in September 1867, and a settlement grows around it.', 'market', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'dcb-deighton', note: 'For September 1867 and the Globe Saloon, the first on the inlet. The most reliable of the three.' },
          { sourceId: 'tce-gastown', locator: '"How Did Gastown Get Its Name?"' },
          { sourceId: 'tce-gassy-jack-lands', note: 'For the canoe, the family, and the saloon built in a day. Unsigned and unsourced; the particulars of the landing vary from one telling to another.' },
        ],
      }),
      draft('incorporation-fire', 1886, 'Incorporation and the Great Fire', 'Vancouver is incorporated on 6 April 1886. On 13 June a clearing fire burns the city to the ground.', 'municipal', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-gastown' },
          { sourceId: 'wiki-great-fire', note: 'For where the fire began, the losses, and the rebuilding. Cites Smith, Vancouver is Ashes, and Matthews.' },
          { sourceId: 'hp-byrnes-block', note: 'For the Byrnes Block and its hotel for seasonal workers.' },
        ],
      }),
      draft('cpr-arrival', 1887, 'First train arrives', 'The first Canadian Pacific Railway train arrives in Vancouver on 23 May 1887, after the company extends its line west from Port Moody.', 'market', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-vancouver', locator: '"Development: 19th Century"', note: 'The date comes from the photograph caption.' },
        ],
      }),
    ],
  },
  {
    id: 'hotel-boom',
    index: 2,
    title: 'The hotel boom',
    period: { start: 1890, end: 1914 },
    summary:
      'Hastings Street becomes the commercial heart of the city, and dozens of hotels go up to house loggers, miners and fishers between seasons.',
    sroThread:
      'Most of today\'s SRO buildings are constructed in this window, as short-stay lodging for working men.',
    // Setup chapter: the market builds the stock the player will inherit.
    office: null,
    factions: [],
    body: [
      { text: 'In 1903 the Carnegie Library opens at Main and Hastings as the city\'s main library, and Woodward\'s department store is established at Hastings and Abbott, where it becomes one of Vancouver\'s main retail destinations. In 1911 the BC Electric Railway builds its terminal at Carrall and Hastings and runs the country\'s most extensive interurban system from it. Hastings Street is the centre of the city.' },
      { text: 'Around these anchors, hotels go up block by block: small single rooms with shared bathrooms, built to lodge loggers, miners and fishers between seasons. Most of the buildings that are SROs today date from these years.', needsSource: true },
      { text: 'This is the stock the rest of the story draws down. The City\'s earliest count, for January 1970, finds 13,462 SRO rooms in the downtown core, 9,603 of them in the Downtown Eastside.' },
    ],
    layers: layers('rail-and-streetcar', 'sro-buildings'),
    events: [
      draft('hotel-construction', 1900, 'Hotel construction peaks', 'Single-room hotels are built block by block along Hastings, Carrall, Powell and Main.', 'market', 'none', ['hv-permits', 'goad-1912'], { endYear: 1914 }),
      draft('carnegie-library', 1903, 'Carnegie Library opens', 'The Carnegie building at Main and Hastings opens as the city\'s main library.', 'municipal', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'vhf-carnegie' },
        ],
      }),
      draft('woodwards-opens', 1903, 'Woodward\'s opens on Hastings', 'Woodward\'s department store is established at Hastings and Abbott and becomes one of the city\'s main retail destinations, anchoring Hastings Street.', 'market', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'cov-woodwards-2003', locator: 'Background' },
          { sourceId: 'hv-woodwards-2005' },
        ],
      }),
      draft('interurban-terminal', 1911, 'Interurban terminal at Carrall and Hastings', 'The BC Electric Railway Company builds its terminal at 425 Carrall Street and runs Canada\'s most extensive interurban system from it.', 'market', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'historic-places-bcer', note: 'The register gives a construction date of 1911; this event was first drafted as 1912.' },
        ],
      }),
    ],
  },
  {
    id: 'neighbours-and-exclusion',
    index: 3,
    title: 'Neighbours and exclusion',
    period: { start: 1907, end: 1942 },
    summary:
      'Chinatown, Paueru Gai and Hogan\'s Alley grow alongside the hotel district under racist law and violence, while the Depression fills the area with unemployed men.',
    sroThread:
      'Rooms shift from seasonal workers to the long-term unemployed and the aging. Short stays become permanent ones.',
    // Narrative only. Play starts in chapter 4, when the planning department exists.
    office: null,
    factions: [],
    body: [
      { text: 'The hotel district shares its streets with Chinatown, with Paueru Gai, the Japanese Canadian neighbourhood along Powell Street, and with Hogan\'s Alley, the city\'s Black community. On 7 September 1907 a mob of white rioters attacks Chinatown, damaging nearly every building, then marches on Powell Street, where residents resist.' },
      { text: 'Law follows violence. The Chinese Immigration Act of 1 July 1923 bans virtually all Chinese immigration until its repeal in 1947. It separates families and leaves a "bachelor society" of men living alone.' },
      { text: 'The Depression fills the area with unemployed men. In April 1935 about 1,500 strike from the federal relief camps and gather in Vancouver. After two months of protest, more than 1,000 leave on 3 June atop freight cars, bound for Ottawa.' },
      { text: 'In 1938 unemployed protesters occupy public buildings in the city and are removed by force.', needsSource: true },
      { text: 'Beginning 24 February 1942, some 21,000 to 22,000 Japanese Canadians are removed from the West Coast without charge, and the federal government strips them of their property. Paueru Gai is emptied.' },
      { text: 'Across these decades the rooms change hands. Built for seasonal workers passing through, they fill with the long-term unemployed and the old. Short stays become permanent ones.', needsSource: true },
    ],
    layers: layers('sro-buildings', 'cultural-districts'),
    events: [
      draft('riot-1907', 1907, 'Anti-Asian riot', 'On 7 September 1907 a mob of white rioters attacks Chinatown, damaging nearly every building, then marches on Japantown, where residents resist.', 'civil', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-1907-riot' },
          { sourceId: 'anderson-chinatown' },
        ],
      }),
      draft('exclusion-act', 1923, 'Chinese Immigration Act', 'The act of 1 July 1923 bans virtually all Chinese immigration until its repeal in 1947, separating families and leaving a "bachelor society" of men living alone.', 'federal', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-chinese-immigration-act' },
        ],
      }),
      draft('on-to-ottawa', 1935, 'Relief camp strike and On-to-Ottawa Trek', 'About 1,500 men from federal relief camps strike in April 1935 and gather in Vancouver. After two months of protest, more than 1,000 leave on 3 June atop freight cars for Ottawa.', 'civil', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-on-to-ottawa' },
        ],
      }),
      draft('post-office-sit-in', 1938, 'Post office sit-in', 'Unemployed protesters occupy public buildings and are violently removed.', 'civil', 'none', ['barnholden-riot']),
      draft('uprooting-1942', 1942, 'Japanese Canadians uprooted', 'Beginning 24 February 1942, some 21,000 to 22,000 Japanese Canadians are removed from the West Coast without charge, emptying Paueru Gai. The federal government strips them of their property.', 'federal', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-internment', note: 'The source describes the coast-wide removal. The effect on Powell Street itself still needs a source.' },
          { sourceId: 'nikkei-museum' },
        ],
      }),
    ],
  },
  {
    id: 'centre-moves-west',
    index: 4,
    title: 'The centre moves west',
    period: { start: 1950, end: 1972 },
    summary:
      'Transit, institutions and retail leave for the new downtown. The area is labelled "Skid Road" and targeted for clearance and a freeway.',
    sroThread:
      'Disinvestment sets in. Hotels stop being upgraded and their tenants are now permanent, older and poorer.',
    office: office('City Planning Department'),
    factions: factions('owners', 'council', 'province', 'merchants', 'health'),
    layers: layers('rail-and-streetcar', 'sro-buildings', 'urban-renewal'),
    events: [
      draft('streetcars-end', 1955, 'Streetcar service ends', 'The last streetcar in regular service runs on 22 April 1955.', 'market', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'translink-buzzer-2017' },
        ],
      }),
      draft('library-moves', 1957, 'Main library leaves Main and Hastings', 'A new central library is built on Burrard Street and the Carnegie stops being the main branch. The building serves as the Vancouver Museum until 1968, then stands empty.', 'municipal', 'decide', [], {
        verified: true,
        historicalChoiceVerified: true,
        citations: [
          { sourceId: 'cov-carnegie-page', locator: '"History of Carnegie"' },
          { sourceId: 'vhf-carnegie' },
        ],
      }),
      draft('interurban-closes', 1958, 'Interurban service ends', 'BC Electric interurban passenger service ends in 1958.', 'market', 'none', [], {
        verified: true,
        citations: [
          { sourceId: 'translink-buzzer-2017', note: 'The source confirms the end of the system. It does not say when service into the Carrall Street terminal stopped.' },
        ],
      }),
      draft('strathcona-clearance', 1958, 'Strathcona urban renewal', 'Blocks of housing are expropriated and demolished for public housing projects. By 1967, 15 Strathcona blocks have been cleared.', 'municipal', 'decide', [], {
        endYear: 1968,
        citations: [
          { sourceId: 'vhf-chan-house', note: 'Confirms the 15 blocks by 1967. The 1958 start and the 1968 end are not yet confirmed.' },
          { sourceId: 'anderson-chinatown' },
          { sourceId: 'hasson-ley' },
          { sourceId: 'opening-doors' },
        ],
      }),
      draft('freeway-fight', 1967, 'Freeway fight', 'A freeway through Strathcona and Chinatown is announced in 1967. Residents led by Mary Lee Chan form the Strathcona Property Owners and Tenants Association, win a federal freeze on urban renewal funds and stop the plan.', 'municipal', 'decide', [], {
        verified: true,
        citations: [
          { sourceId: 'vhf-chan-house' },
          { sourceId: 'tce-hogans-alley' },
          { sourceId: 'hasson-ley' },
        ],
      }),
      draft('viaducts', 1967, 'Viaducts built over Hogan\'s Alley', 'Beginning in 1967 the City levels the western half of Hogan\'s Alley to build the Georgia and Dunsmuir viaducts, the first stage of the freeway. Community opposition stops the remaining stages.', 'municipal', 'decide', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-hogans-alley', note: 'This event was first drafted as the 1972 opening, which is not yet confirmed.' },
          { sourceId: 'compton-canaan' },
        ],
      }),
    ],
  },
  {
    id: 'naming-the-dtes',
    index: 5,
    title: 'Naming the Downtown Eastside',
    period: { start: 1973, end: 1986 },
    summary:
      'Residents reject "Skid Road", name their neighbourhood and organize as tenants, then face mass eviction ahead of a world\'s fair.',
    sroThread:
      'Tenants press for safer hotels and win a community centre, but stricter by-law enforcement also closes rooms. Expo 86 brings mass evictions.',
    office: office('City Planning Department'),
    // Organized tenants hold seats from here on.
    factions: factions('tenants', 'owners', 'council', 'province', 'merchants', 'health'),
    layers: layers('sro-buildings', 'services', 'evictions-and-closures'),
    events: [
      draft('dera-founded', 1973, 'DERA founded', 'The Downtown Eastside Residents Association forms and gives the neighbourhood its name.', 'civil', 'respond', ['hasson-ley']),
      draft('fire-bylaw-enforcement', 1974, 'Fire by-law enforcement closes hotels', 'The City begins upgrading hotels under the Fire By-law in mid-1974, starting with Downtown Eastside buildings of more than 20 rooms. Most comply, but enforcement contributes to the closure, conversion or demolition of an estimated 2,300 rental units by 1976.', 'municipal', 'decide', [], {
        endYear: 1976,
        verified: true,
        citations: [{ sourceId: 'cov-survey-2007', locator: 'PDF pp. 57-58 (Appendix E)', note: 'The 2,300 figure is a 1977 City Planning estimate for the downtown peninsula and Strathcona.' }],
      }),
      draft('carnegie-centre', 1980, 'Carnegie Community Centre opens', 'The residents\' association proposes turning the empty building into a community centre with a library. Council approves in 1978 and the centre opens on 20 January 1980.', 'municipal', 'decide', [], {
        verified: true,
        historicalChoiceVerified: true,
        citations: [
          { sourceId: 'cov-carnegie-page', locator: '"History of Carnegie"' },
          { sourceId: 'vhf-carnegie' },
        ],
      }),
      draft('expo-evictions', 1986, 'Expo 86 evictions', 'Long-term hotel tenants are evicted so rooms can be rented to tourists. An estimated 700 to 1,000 residents are displaced, mainly in February and March 1986. Almost all the hotels return to residential use within a year.', 'provincial', 'respond', [], {
        verified: true,
        citations: [
          { sourceId: 'cov-survey-2007', locator: 'PDF p. 59 (Appendix E)', note: 'The City report gives the estimate by citing Olds (1989); it says the number of rooms converted could not be established.' },
          { sourceId: 'olds-expo' },
        ],
      }),
    ],
  },
  {
    id: 'compounding-crises',
    index: 6,
    title: 'Compounding crises',
    period: { start: 1987, end: 2003 },
    summary:
      'Psychiatric deinstitutionalization, a changing drug supply, an HIV epidemic, retail collapse and the disappearance of women converge on a few blocks.',
    sroThread:
      'The hotels absorb people whom the health and housing systems have dropped, without the staffing or repair to support them.',
    office: office('City Planning Department'),
    factions: factions('tenants', 'owners', 'council', 'province', 'merchants', 'health'),
    layers: layers('sro-buildings', 'services', 'evictions-and-closures'),
    events: [
      draft('memorial-march', 1992, 'First Women\'s Memorial March', 'After the murder of Cheryl Ann Joe, her family and neighbours gather on 14 February 1992. The memorial becomes an annual march honouring missing and murdered Indigenous women and girls.', 'civil', 'respond', [], {
        verified: true,
        citations: [
          { sourceId: 'tce-memorial-march' },
          { sourceId: 'red-women-rising' },
          { sourceId: 'forsaken' },
        ],
      }),
      draft('woodwards-closes', 1993, 'Woodward\'s closes', 'Woodward\'s closes its Hastings Street store. The property is sold to a private developer in 1995, bought by the Province in 2001 and by the City in 2003.', 'market', 'respond', [], {
        verified: true,
        historicalChoiceVerified: true,
        citations: [
          { sourceId: 'cov-woodwards-2003', locator: 'Background' },
          { sourceId: 'hv-woodwards-2005' },
        ],
      }),
      draft('health-emergency-1997', 1997, 'Public health emergency declared', 'The Vancouver/Richmond Health Board declares a public health emergency over the surge in HIV infection among people who inject drugs.', 'provincial', 'respond', [], {
        citations: [
          { sourceId: 'tyee-insite-2006', note: 'Confirms the declaration and ties it to the 1996-1997 infection rate, but does not give the year it was declared.' },
          { sourceId: 'thousand-dreams' },
        ],
      }),
      draft('vandu', 1998, 'VANDU founded', 'Drug users organize their own advocacy network.', 'civil', 'respond', [], {
        citations: [
          { sourceId: 'thousand-dreams', note: 'Online sources disagree on the founding year: some give 1997, others 1998.' },
        ],
      }),
      draft('woodsquat', 2002, 'Woodward\'s squat', 'On 14 September 2002 housing activists occupy the empty Woodward\'s building, demanding social housing. Six days in, police arrest 54 squatters; a tent city on the sidewalk outside lasts until 12 December, when its residents accept hotel rooms.', 'civil', 'respond', ['blomley-unsettling', 'cbc-woodsquat-2022', 'cag-woodsquat']),
      draft('insite', 2003, 'Insite opens', 'Insite, the first legal supervised drug injection site in North America, opens in September 2003.', 'provincial', 'respond', [], {
        verified: true,
        citations: [
          { sourceId: 'phs-insite' },
          { sourceId: 'thousand-dreams' },
        ],
      }),
      draft('sra-bylaw', 2003, 'Single Room Accommodation By-law', 'The City enacts the Single Room Accommodation By-law, regulating the conversion and demolition of rooms under 320 square feet in rooming houses and residential hotels in the downtown core.', 'municipal', 'decide', [], {
        verified: true,
        historicalChoiceVerified: true,
        citations: [{ sourceId: 'cov-report-2020', locator: 'PDF p. 3' }, { sourceId: 'cov-sra-bylaw' }],
      }),
    ],
  },
  {
    id: 'speculation-and-loss',
    index: 7,
    title: 'Speculation and loss',
    period: { start: 2003, end: null },
    summary:
      'Public purchases and private speculation pull the hotel stock in opposite directions while a toxic drug supply drives a second emergency.',
    sroThread:
      'Rooms are lost to rent increases, conversion, closure orders and fire faster than replacement housing is built.',
    office: office('Planning, Urban Design and Sustainability'),
    factions: factions('tenants', 'owners', 'council', 'province', 'merchants', 'health'),
    layers: layers('sro-buildings', 'ownership', 'evictions-and-closures'),
    events: [
      draft('province-buys-hotels', 2007, 'Province buys SRO hotels', 'The Province buys nine SRO hotels and one apartment building, 595 units in all, in early 2007. By 2011 BC Housing has bought and renovated 13 hotels with about 900 rooms.', 'provincial', 'respond', [], {
        verified: true,
        citations: [
          { sourceId: 'cov-survey-2007', locator: 'PDF pp. 4, 29' },
          { sourceId: 'cov-report-2020', locator: 'PDF p. 5' },
        ],
      }),
      draft('olympics-woodwards', 2010, 'Winter Olympics and the Woodward\'s redevelopment', 'A mixed-income tower opens on the Woodward\'s site as the city hosts the Games.', 'municipal', 'decide', ['blomley-unsettling', 'ccap-hotel-reports']),
      draft('dtes-plan', 2014, 'Downtown Eastside Plan adopted', 'Council adopts the Downtown Eastside Plan in March 2014. It calls for replacing 4,500 SRO rooms with self-contained units over 30 years.', 'municipal', 'decide', [], {
        verified: true,
        citations: [{ sourceId: 'cov-report-2016', locator: 'PDF pp. 2, 20' }, { sourceId: 'cov-dtes-plan' }],
      }),
      draft('overdose-emergency', 2016, 'Overdose public health emergency', 'In April 2016 the provincial health officer and the health minister declare a public health emergency in response to the opioid overdose crisis.', 'provincial', 'respond', [], {
        verified: true,
        citations: [
          { sourceId: 'bc-gov-overdose-2016' },
          { sourceId: 'bc-coroners' },
        ],
      }),
      draft('balmoral-regent', 2017, 'Balmoral and Regent hotels closed', 'The City orders the Balmoral and Regent hotels closed as unsafe, displacing more than 300 tenants, and expropriates both buildings in 2020.', 'municipal', 'decide', [], {
        endYear: 2018,
        verified: true,
        historicalChoiceVerified: true,
        citations: [
          { sourceId: 'cov-report-2020', locator: 'PDF pp. 8, 12', note: 'The report is inconsistent on the years: p. 12 says the closures were in 2017 and 2018, p. 8 says 2018 and 2019.' },
          { sourceId: 'cov-report-2023', locator: 'PDF pp. 5-6' },
        ],
      }),
      draft('winters-fire', 2022, 'Winters Hotel fire', 'A fire destroys an SRO in Gastown and kills residents.', 'market', 'respond', ['ccap-hotel-reports']),
      draft('hastings-decampment', 2023, 'Hastings Street decampment', 'The city and police remove the tent encampment along East Hastings.', 'municipal', 'decide', ['ccap-hotel-reports']),
    ],
  },
  {
    id: 'rooms-today',
    index: 8,
    title: 'The rooms today',
    period: { start: 2026, end: null },
    summary:
      'What remains of the stock: who owns it, what condition it is in and what it costs to live there.',
    sroThread:
      'The same buildings from chapter 2, more than a century on, are still the last housing before the street.',
    office: office('Planning, Urban Design and Sustainability'),
    factions: factions('tenants', 'owners', 'council', 'province', 'merchants', 'health'),
    layers: layers('sro-buildings', 'ownership'),
    events: [],
  },
]

/** Every event in order, tagged with its chapter. Useful for a timeline or audit view. */
export const allEvents = chapters.flatMap((chapter) =>
  chapter.events.map((event) => ({ ...event, chapterId: chapter.id })),
)

/** Events still waiting on a source check. */
export const unverifiedEvents = allEvents.filter((event) => !event.verified)

/** Events the office can act on but that have no recommendations written yet. */
export const eventsNeedingChoices = allEvents.filter(
  (event) => event.agency !== 'none' && !event.choices?.length,
)

/** Ids in choices.ts that match no event. Should always be empty. */
export const orphanChoiceIds = Object.keys(eventChoices).filter(
  (id) => !allEvents.some((event) => event.id === id),
)
