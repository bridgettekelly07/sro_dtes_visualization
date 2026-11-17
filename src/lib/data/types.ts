/** What kind of evidence a source is. Primary sources settle dates and counts. */
export type SourceKind =
  | 'primary-record' // bylaws, council reports, surveys, inquiry reports
  | 'dataset' // tabular or spatial data that can be loaded into the app
  | 'archive' // photo, map and document collections
  | 'scholarship' // peer-reviewed or academic press
  | 'community' // produced by DTES residents and organizations
  | 'oral-history'

export interface Source {
  id: string
  title: string
  author: string
  /** Publication year, or a range for ongoing series. */
  year: string
  kind: SourceKind
  /** What this source is good for in this project. */
  use: string
  /** Fill in once the exact edition or page has been located. */
  url?: string
}

/** A pointer from a claim to the place in a source that supports it. */
export interface Citation {
  sourceId: string
  /** Page, section, table or record number. Empty until checked. */
  locator?: string
  /** Anything a reader should know about how the source supports the claim. */
  note?: string
}

/** Who originates an event. Only `municipal` events are the city's to decide. */
export type Jurisdiction =
  | 'federal'
  | 'provincial'
  | 'municipal'
  | 'market' // private owners, companies and investors
  | 'civil' // residents, organizations and crowds

/**
 * What the planning office can do about an event.
 * - `none`: it happens; the player only sees its effects.
 * - `respond`: it cannot be stopped, but the office recommends how to absorb it.
 * - `decide`: a city decision; the office recommends and council adopts or rejects.
 */
export type Agency = 'none' | 'respond' | 'decide'

export type IndicatorId = 'rooms' | 'affordability' | 'safety' | 'legitimacy'

export type FactionId =
  | 'tenants'
  | 'owners'
  | 'council'
  | 'province'
  | 'merchants'
  | 'health'

/** Deltas are relative steps, not real units, until the simulation is tuned. */
export type Effect =
  | { kind: 'indicator'; indicator: IndicatorId; delta: number; delayYears?: number }
  | { kind: 'faction'; faction: FactionId; delta: number }
  | { kind: 'capital'; delta: number }

/** A recommendation the office can put to council. */
export interface Choice {
  id: string
  label: string
  /** Capital spent if adopted. */
  cost: number
  /** How each faction leans on this option, from -2 (opposes) to 2 (backs). */
  stances: Partial<Record<FactionId, number>>
  ifAdopted: Effect[]
  /** The office recommended it and council said no. */
  ifRejected: Effect[]
}

export interface ChapterEvent {
  id: string
  year: number
  /** Set when the event spans several years. */
  endYear?: number
  title: string
  summary: string
  jurisdiction: Jurisdiction
  agency: Agency
  /** Applied whatever the player does. */
  effects: Effect[]
  /** Present only when agency is `respond` or `decide`. */
  choices?: Choice[]
  /** The option actually taken, for the end-of-chapter comparison. */
  historicalChoiceId?: string
  /** True once a source confirms that this was the option the city took. */
  historicalChoiceVerified?: boolean
  /** Sources to check this event against, and later the exact citation. */
  citations: Citation[]
  /**
   * False until the date and summary have been confirmed against at least
   * one cited source with a locator. The app can hide or flag unverified events.
   */
  verified: boolean
}

/** Map layers a chapter can switch on. Extend as datasets are added. */
export type LayerId =
  | 'shoreline-historic'
  | 'rail-and-streetcar'
  | 'sro-buildings'
  | 'cultural-districts'
  | 'urban-renewal'
  | 'evictions-and-closures'
  | 'services'
  | 'ownership'

export interface Paragraph {
  text: string
  /** True while the paragraph makes a claim no source has yet confirmed. */
  needsSource?: boolean
}

export interface Chapter {
  id: string
  /** Display order, starting at 1. */
  index: number
  title: string
  /** `end: null` means ongoing. */
  period: { start: number; end: number | null }
  /** One or two sentences shown as the chapter's lead text. */
  summary: string
  /** Who is living in the rooms and what is happening to the room count. */
  sroThread: string
  /**
   * The chapter told as prose, for chapters read as narrative. Each paragraph
   * says whether it still rests on an unverified event or an unsourced reading.
   */
  body?: Paragraph[]
  /**
   * The seat the player occupies in this chapter. `null` means the chapter
   * is not played: it runs as narrative only. The player is the office, so
   * stock and indicators carry over between chapters while faction support resets.
   */
  office: { title: string; verified: boolean } | null
  /** Factions that exist and hold seats in this chapter. */
  factions: FactionId[]
  layers: LayerId[]
  events: ChapterEvent[]
}
