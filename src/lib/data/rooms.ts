/**
 * SRO room counts from City of Vancouver low-income housing surveys.
 * Every figure here was read in the City report named beside it, with its PDF page.
 *
 * Definitions, from the surveys:
 * - SRO housing is "privately owned buildings containing three or more rented
 *   single-room occupancy units" (2009 survey, PDF p. 9). Rooms bought by
 *   government or secured as non-market housing leave this count, so a falling
 *   line means rooms closed, demolished, converted or moved into public hands.
 * - The Downtown Core is the survey area: Burrard Street to Clark Drive, and the
 *   waterfront south to Terminal Avenue and False Creek. The Downtown Eastside
 *   is its largest sub-area.
 *
 * Other City reports quote slightly different numbers for the same years
 * (for example 6,314 rooms in March 2003 against 6,490 here). Those are counts
 * on the survey date; Table A1 restates the stock as of January 1 each year.
 * This file uses Table A1 throughout 1970 to 2010 so the series is consistent.
 */
export type RoomSeries = 'core-private' | 'dtes-private' | 'core-all-open'

export interface RoomSource {
  title: string
  url: string
}

export const roomSources = {
  'survey-2009': {
    title: 'City of Vancouver, 2009 Survey of Low-Income Housing in the Downtown Core',
    url: 'https://vancouver.ca/docs/policy/housing-2009-low-income-survey.pdf',
  },
  'survey-2015': {
    title: 'City of Vancouver, Replacement, Renewal & Change: 2015 Survey of Single Room Accommodation and Non-Market Housing in the Downtown Core',
    url: 'https://vancouver.ca/files/cov/2015-survey-single-room-accommodation-non-market-housing-downtown-core.pdf',
  },
  'report-2020': {
    title: 'City of Vancouver, SRO Revitalization Progress Update and 2019 Low Income Housing Survey (council report, 2020)',
    url: 'https://council.vancouver.ca/20201007/documents/pspc1a.pdf',
  },
  'report-2023': {
    title: 'City of Vancouver, 2023 Downtown Core Low-Income Housing Survey (council report, 2023)',
    url: 'https://council.vancouver.ca/20230530/documents/r4.pdf',
  },
} as const satisfies Record<string, RoomSource>

export type RoomSourceId = keyof typeof roomSources

export interface RoomCount {
  series: RoomSeries
  /** Position on the time axis. Fractions place a mid-year or year-end survey. */
  year: number
  /** Survey date as stated in the source. */
  asOf: string
  rooms: number
  /** True when the source gives a rounded figure. */
  approximate?: boolean
  buildings?: number
  sourceId: RoomSourceId
  /** Page of the PDF file, not the printed page number. */
  pdfPage: number
  note?: string
}

/**
 * 2009 survey, Table A1, "Downtown Core SROs, January 1970 - January 2010".
 * Stock on January 1 of each year: [year, Downtown Core total, Downtown Eastside].
 */
const tableA1: [number, number, number][] = [
  [1970, 13462, 9603], [1971, 13140, 9393], [1972, 12813, 9066], [1973, 12571, 9059],
  [1974, 11979, 8520], [1975, 11159, 7892], [1976, 10641, 7560], [1977, 10559, 7532],
  [1978, 10513, 7507], [1979, 10156, 7323], [1980, 9803, 7008], [1981, 9596, 6810],
  [1982, 9009, 6482], [1983, 8807, 6321], [1984, 8794, 6358], [1985, 8585, 6213],
  [1986, 8259, 6138], [1987, 8295, 6312], [1988, 8307, 6207], [1989, 8283, 6240],
  [1990, 8108, 6077], [1991, 7922, 5990], [1992, 7860, 5952], [1993, 7767, 5964],
  [1994, 7730, 5925], [1995, 7559, 5782], [1996, 7539, 5761], [1997, 7523, 5730],
  [1998, 7094, 5550], [1999, 6751, 5348], [2000, 6610, 5326], [2001, 6429, 5148],
  [2002, 6551, 5270], [2003, 6490, 5273], [2004, 6235, 5137], [2005, 6263, 5181],
  [2006, 6210, 5135], [2007, 6068, 5008], [2008, 5440, 4680], [2009, 4884, 4180],
  [2010, 4401, 3827],
]

const fromTableA1: RoomCount[] = tableA1.flatMap(([year, core, dtes]) => {
  const base = {
    year,
    asOf: `January ${year}`,
    sourceId: 'survey-2009' as const,
    pdfPage: year <= 1998 ? 33 : 34,
  }
  return [
    { ...base, series: 'core-private' as const, rooms: core },
    { ...base, series: 'dtes-private' as const, rooms: dtes },
  ]
})

export const roomCounts: RoomCount[] = [
  ...fromTableA1,
  {
    series: 'core-private',
    year: 2016,
    asOf: 'January 2016',
    rooms: 4379,
    buildings: 110,
    sourceId: 'survey-2015',
    pdfPage: 12,
  },
  {
    series: 'dtes-private',
    year: 2016,
    asOf: 'January 2016',
    rooms: 3943,
    buildings: 103,
    sourceId: 'survey-2015',
    pdfPage: 12,
  },
  {
    series: 'core-private',
    year: 2017.9,
    asOf: 'Late 2017',
    rooms: 4102,
    sourceId: 'report-2020',
    pdfPage: 49,
  },
  {
    series: 'core-private',
    year: 2019.95,
    asOf: 'December 2019',
    rooms: 4055,
    buildings: 113,
    sourceId: 'report-2020',
    pdfPage: 49,
    note: 'The Balmoral and Regent closures account for most of the drop since 2017.',
  },
  {
    series: 'core-private',
    year: 2023,
    asOf: 'January 2023',
    rooms: 3305,
    buildings: 92,
    sourceId: 'report-2023',
    pdfPage: 25,
    note: 'Includes 131 rooms owned by Chinese benevolent societies and 338 privately owned rooms run by non-profits.',
  },
  {
    series: 'dtes-private',
    year: 2023,
    asOf: 'May 2023',
    rooms: 2817,
    buildings: 83,
    sourceId: 'report-2023',
    pdfPage: 20,
    note: 'The report notes this sub-area count includes four SROs just outside the study area.',
  },
  {
    series: 'core-all-open',
    year: 2019.95,
    asOf: '2019',
    rooms: 6680,
    approximate: true,
    sourceId: 'report-2020',
    pdfPage: 5,
    note: '55 percent privately owned, 45 percent government or non-profit owned.',
  },
  {
    series: 'core-all-open',
    year: 2023,
    asOf: 'January 2023',
    rooms: 6567,
    buildings: 146,
    sourceId: 'report-2023',
    pdfPage: 4,
    note: 'By owner: private 3,174; Chinese benevolent societies 131; BC Housing 2,122; City 419; non-profit 721.',
  },
]
