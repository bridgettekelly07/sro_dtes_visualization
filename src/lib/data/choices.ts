import type { Choice, Effect, FactionId, IndicatorId } from './types'

/**
 * Recommendations the planning office can make, keyed by event id.
 *
 * Everything here is a draft:
 * - Costs, stances and effect sizes are untuned placeholders on a small
 *   relative scale (-2 to 2). They show direction, not magnitude.
 * - `historicalChoiceId` is set only where the record seems clear, and is
 *   still unverified. Where the city's actual position was mixed or unclear
 *   it is left out; fill it in when the event is checked against its sources.
 */
export interface EventChoices {
  choices: Choice[]
  historicalChoiceId?: string
}

const ind = (indicator: IndicatorId, delta: number, delayYears?: number): Effect => ({
  kind: 'indicator',
  indicator,
  delta,
  ...(delayYears !== undefined && { delayYears }),
})
const fac = (faction: FactionId, delta: number): Effect => ({ kind: 'faction', faction, delta })

export const eventChoices: Record<string, EventChoices> = {
  // Chapter 3: Neighbours and exclusion
  // Shelved: chapter 3 is now narrative only, so these four are not attached to
  // their events. Kept in case play is later extended back before 1950.

  'riot-1907': {
    choices: [
      {
        id: 'protect-and-compensate',
        label: 'Recommend the city protect the districts and support compensation',
        cost: 1,
        stances: { council: -1, merchants: -1 },
        ifAdopted: [ind('legitimacy', 1), ind('safety', 1)],
        ifRejected: [ind('legitimacy', -1)],
      },
      {
        id: 'no-municipal-action',
        label: 'Recommend no municipal action',
        cost: 0,
        stances: { council: 1, merchants: 1 },
        ifAdopted: [ind('legitimacy', -2), ind('safety', -1)],
        ifRejected: [],
      },
    ],
  },

  'on-to-ottawa': {
    historicalChoiceId: 'leave-to-senior-governments',
    choices: [
      {
        id: 'municipal-relief',
        label: 'Recommend city relief for single men lodging in the hotels',
        cost: 2,
        stances: { council: -1, owners: 1, merchants: -1, health: 1 },
        ifAdopted: [ind('affordability', 1), ind('legitimacy', 1)],
        ifRejected: [ind('legitimacy', -1)],
      },
      {
        id: 'leave-to-senior-governments',
        label: 'Recommend leaving relief to the province and Ottawa',
        cost: 0,
        stances: { council: 2, merchants: 1 },
        ifAdopted: [ind('affordability', -1), ind('legitimacy', -1)],
        ifRejected: [],
      },
    ],
  },

  'post-office-sit-in': {
    historicalChoiceId: 'clear-the-buildings',
    choices: [
      {
        id: 'emergency-lodging',
        label: 'Recommend emergency lodging for the unemployed',
        cost: 2,
        stances: { council: -1, owners: 1, health: 1 },
        ifAdopted: [ind('safety', 1), ind('legitimacy', 1)],
        ifRejected: [ind('legitimacy', -1)],
      },
      {
        id: 'clear-the-buildings',
        label: 'Recommend supporting removal of the occupiers',
        cost: 0,
        stances: { council: 1, merchants: 2 },
        ifAdopted: [ind('safety', -1), ind('legitimacy', -2)],
        ifRejected: [],
      },
    ],
  },

  'uprooting-1942': {
    choices: [
      {
        id: 'hold-in-trust',
        label: 'Recommend the emptied homes and shops be held for their owners\' return',
        cost: 1,
        stances: { council: -2, owners: -1, merchants: -1 },
        ifAdopted: [ind('legitimacy', 2)],
        ifRejected: [ind('legitimacy', -1)],
      },
      {
        id: 'relet-vacated',
        label: 'Recommend reletting the emptied buildings to wartime workers',
        cost: 0,
        stances: { council: 2, owners: 2, merchants: 1 },
        ifAdopted: [ind('rooms', 1), ind('legitimacy', -2)],
        ifRejected: [],
      },
    ],
  },

  // Chapter 4: The centre moves west

  'library-moves': {
    historicalChoiceId: 'new-library-downtown',
    choices: [
      {
        id: 'new-library-downtown',
        label: 'Recommend a new main library in the new downtown',
        cost: 2,
        stances: { council: 2, merchants: -1 },
        ifAdopted: [ind('legitimacy', -1), fac('merchants', -1)],
        ifRejected: [],
      },
      {
        id: 'keep-library',
        label: 'Recommend keeping the main library at Main and Hastings',
        cost: 1,
        stances: { council: -1, merchants: 2 },
        ifAdopted: [ind('legitimacy', 1), fac('merchants', 1)],
        ifRejected: [fac('council', -1)],
      },
    ],
  },

  'strathcona-clearance': {
    historicalChoiceId: 'clear-and-rebuild',
    choices: [
      {
        id: 'clear-and-rebuild',
        label: 'Recommend clearing blocks for public housing projects',
        cost: 3,
        stances: { council: 2, province: 1, health: 1, owners: -1 },
        ifAdopted: [ind('rooms', -1, 2), ind('safety', 1, 4), ind('legitimacy', -2)],
        ifRejected: [],
      },
      {
        id: 'rehabilitate',
        label: 'Recommend repairing existing houses with their residents in place',
        cost: 2,
        stances: { council: -1, province: -1, owners: 1 },
        ifAdopted: [ind('safety', 1, 3), ind('legitimacy', 2)],
        ifRejected: [ind('legitimacy', 1)],
      },
    ],
  },

  'freeway-fight': {
    historicalChoiceId: 'recommend-freeway',
    choices: [
      {
        id: 'recommend-freeway',
        label: 'Recommend the freeway route',
        cost: 3,
        stances: { council: 1, merchants: 1, province: 1 },
        ifAdopted: [ind('rooms', -2, 3), ind('legitimacy', -2)],
        ifRejected: [ind('legitimacy', -1)],
      },
      {
        id: 'recommend-against',
        label: 'Recommend against the route',
        cost: 0,
        stances: { council: -1, merchants: -1, province: -1 },
        ifAdopted: [ind('legitimacy', 1)],
        ifRejected: [ind('rooms', -2, 3), fac('council', -1)],
      },
    ],
  },

  viaducts: {
    historicalChoiceId: 'build-viaducts',
    choices: [
      {
        id: 'build-viaducts',
        label: 'Recommend building the new viaducts',
        cost: 3,
        stances: { council: 2, merchants: 1, province: 1 },
        ifAdopted: [ind('rooms', -1), ind('legitimacy', -2)],
        ifRejected: [],
      },
      {
        id: 'keep-street-grid',
        label: 'Recommend keeping the existing streets and the blocks beside them',
        cost: 1,
        stances: { council: -2, merchants: -1 },
        ifAdopted: [ind('legitimacy', 1)],
        ifRejected: [ind('rooms', -1), fac('council', -1)],
      },
    ],
  },

  // Chapter 5: Naming the Downtown Eastside

  'dera-founded': {
    choices: [
      {
        id: 'recognize-residents',
        label: 'Recommend recognizing and funding the residents\' association',
        cost: 1,
        stances: { tenants: 2, owners: -2, merchants: -1, council: 0 },
        ifAdopted: [ind('legitimacy', 2), fac('tenants', 1)],
        ifRejected: [fac('tenants', 1), ind('legitimacy', -1)],
      },
      {
        id: 'consult-owners-only',
        label: 'Recommend continuing to consult owners and merchants only',
        cost: 0,
        stances: { tenants: -2, owners: 2, merchants: 1 },
        ifAdopted: [ind('legitimacy', -2), fac('tenants', -1)],
        ifRejected: [],
      },
    ],
  },

  'carnegie-centre': {
    historicalChoiceId: 'convert-to-community-centre',
    choices: [
      {
        id: 'convert-to-community-centre',
        label: 'Recommend converting the old library into a community centre',
        cost: 2,
        stances: { tenants: 2, health: 1, merchants: -1, council: 0 },
        ifAdopted: [ind('safety', 1), ind('legitimacy', 2)],
        ifRejected: [ind('legitimacy', -1), fac('tenants', -1)],
      },
      {
        id: 'sell-the-building',
        label: 'Recommend selling the building',
        cost: -1,
        stances: { tenants: -2, owners: 1, merchants: 1, council: 1 },
        ifAdopted: [{ kind: 'capital', delta: 1 }, ind('legitimacy', -2)],
        ifRejected: [],
      },
    ],
  },

  'expo-evictions': {
    choices: [
      {
        id: 'seek-tenant-protection',
        label: 'Recommend pressing for legal protection for long-term hotel residents',
        cost: 1,
        stances: { tenants: 2, owners: -2, province: -2, health: 1 },
        ifAdopted: [ind('rooms', 1), ind('legitimacy', 1)],
        ifRejected: [ind('rooms', -2), ind('legitimacy', 1)],
      },
      {
        id: 'relocation-help-only',
        label: 'Recommend relocation help for evicted tenants',
        cost: 1,
        stances: { tenants: 0, owners: 1, province: 1, council: 1 },
        ifAdopted: [ind('rooms', -2), ind('safety', 1)],
        ifRejected: [ind('rooms', -2), ind('safety', -1)],
      },
      {
        id: 'no-intervention',
        label: 'Recommend no intervention in private hotels',
        cost: 0,
        stances: { tenants: -2, owners: 2, province: 2, merchants: 1 },
        ifAdopted: [ind('rooms', -2), ind('safety', -1), ind('legitimacy', -2)],
        ifRejected: [],
      },
    ],
  },

  // Chapter 6: Compounding crises

  'memorial-march': {
    choices: [
      {
        id: 'womens-safety-and-housing',
        label: 'Recommend women-only housing and a safety review of the hotels',
        cost: 2,
        stances: { tenants: 2, health: 1, owners: -1, council: 0 },
        ifAdopted: [ind('safety', 2, 1), ind('legitimacy', 1)],
        ifRejected: [ind('legitimacy', -1)],
      },
      {
        id: 'leave-to-police',
        label: 'Recommend leaving the matter to the police',
        cost: 0,
        stances: { tenants: -2, council: 1 },
        ifAdopted: [ind('safety', -2), ind('legitimacy', -2)],
        ifRejected: [],
      },
    ],
  },

  'woodwards-closes': {
    historicalChoiceId: 'wait-for-private-buyer',
    choices: [
      {
        id: 'acquire-for-housing',
        label: 'Recommend the city acquire the building for housing',
        cost: 3,
        stances: { tenants: 2, owners: -1, merchants: -1, council: -1 },
        ifAdopted: [ind('rooms', 1, 4), ind('legitimacy', 2)],
        ifRejected: [ind('legitimacy', 1)],
      },
      {
        id: 'wait-for-private-buyer',
        label: 'Recommend waiting for a private buyer',
        cost: 0,
        stances: { tenants: -1, owners: 1, merchants: 1, council: 1 },
        ifAdopted: [ind('safety', -1, 2), ind('legitimacy', -1)],
        ifRejected: [],
      },
    ],
  },

  'health-emergency-1997': {
    choices: [
      {
        id: 'site-health-services',
        label: 'Recommend zoning and sites for health services in the neighbourhood',
        cost: 2,
        stances: { health: 2, tenants: 1, merchants: -2, owners: -1 },
        ifAdopted: [ind('safety', 2, 1), fac('merchants', -1)],
        ifRejected: [ind('safety', -1), fac('health', -1)],
      },
      {
        id: 'disperse-services',
        label: 'Recommend spreading services across the city',
        cost: 1,
        stances: { health: -1, tenants: -1, merchants: 2, council: 1 },
        ifAdopted: [ind('safety', -1), ind('legitimacy', -1)],
        ifRejected: [],
      },
    ],
  },

  vandu: {
    choices: [
      {
        id: 'seat-at-the-table',
        label: 'Recommend giving the drug users\' network a seat in planning',
        cost: 0,
        stances: { tenants: 2, health: 1, merchants: -2, council: -1 },
        ifAdopted: [ind('legitimacy', 2), ind('safety', 1, 2)],
        ifRejected: [ind('legitimacy', -1)],
      },
      {
        id: 'consult-through-agencies',
        label: 'Recommend consulting through health agencies only',
        cost: 0,
        stances: { tenants: -1, health: 0, merchants: 1, council: 1 },
        ifAdopted: [ind('legitimacy', -1)],
        ifRejected: [],
      },
    ],
  },

  woodsquat: {
    choices: [
      {
        id: 'commit-to-social-housing',
        label: 'Recommend committing the building to social housing',
        cost: 3,
        stances: { tenants: 2, province: -1, owners: -1, merchants: -1 },
        ifAdopted: [ind('rooms', 1, 5), ind('legitimacy', 2)],
        ifRejected: [ind('legitimacy', 1), fac('tenants', 1)],
      },
      {
        id: 'seek-removal',
        label: 'Recommend removing the occupation',
        cost: 0,
        stances: { tenants: -2, province: 1, merchants: 2, council: 1 },
        ifAdopted: [ind('legitimacy', -2), fac('tenants', -1)],
        ifRejected: [],
      },
    ],
  },

  insite: {
    historicalChoiceId: 'support-the-site',
    choices: [
      {
        id: 'support-the-site',
        label: 'Recommend supporting the site with zoning and permits',
        cost: 1,
        stances: { health: 2, tenants: 2, merchants: -2, council: 1 },
        ifAdopted: [ind('safety', 2), ind('legitimacy', 1)],
        ifRejected: [ind('safety', -1), fac('health', -1)],
      },
      {
        id: 'oppose-the-site',
        label: 'Recommend against a site in the neighbourhood',
        cost: 0,
        stances: { health: -2, tenants: -2, merchants: 2 },
        ifAdopted: [ind('safety', -2), ind('legitimacy', -2)],
        ifRejected: [],
      },
    ],
  },

  'sra-bylaw': {
    historicalChoiceId: 'regulate-conversion',
    choices: [
      {
        id: 'regulate-conversion',
        label: 'Recommend regulating conversion and demolition',
        cost: 1,
        stances: { tenants: 2, owners: -2, council: 1, health: 1 },
        ifAdopted: [ind('rooms', 1), fac('owners', -1)],
        ifRejected: [ind('rooms', -1, 2)],
      },
      {
        id: 'leave-to-market',
        label: 'Recommend no new regulation',
        cost: 0,
        stances: { tenants: -2, owners: 2, merchants: 1 },
        ifAdopted: [ind('rooms', -2, 2), ind('legitimacy', -1)],
        ifRejected: [fac('owners', -1)],
      },
    ],
  },

  // Chapter 7: Speculation and loss

  'province-buys-hotels': {
    choices: [
      {
        id: 'co-fund-renovation',
        label: 'Recommend city money to renovate the purchased hotels',
        cost: 3,
        stances: { tenants: 1, province: 2, health: 1, council: -1 },
        ifAdopted: [ind('safety', 2, 2), ind('affordability', 1)],
        ifRejected: [ind('safety', -1, 2)],
      },
      {
        id: 'city-land-for-new-housing',
        label: 'Recommend offering city land for new self-contained housing',
        cost: 2,
        stances: { tenants: 1, province: 1, council: 1, merchants: -1 },
        ifAdopted: [ind('rooms', 1, 5), ind('affordability', 1, 5)],
        ifRejected: [],
      },
    ],
  },

  'olympics-woodwards': {
    historicalChoiceId: 'mixed-income',
    choices: [
      {
        id: 'mixed-income',
        label: 'Recommend a mixed project with market condos funding social housing',
        cost: 2,
        stances: { council: 2, owners: 2, merchants: 2, tenants: -1, province: 1 },
        ifAdopted: [ind('rooms', 1), ind('affordability', -1, 3), ind('legitimacy', -1)],
        ifRejected: [],
      },
      {
        id: 'all-social-housing',
        label: 'Recommend an all social housing project',
        cost: 4,
        stances: { council: -1, owners: -2, merchants: -1, tenants: 2, province: -1 },
        ifAdopted: [ind('rooms', 2), ind('legitimacy', 2)],
        ifRejected: [ind('legitimacy', 1)],
      },
    ],
  },

  'dtes-plan': {
    historicalChoiceId: 'reserve-core-for-rental',
    choices: [
      {
        id: 'reserve-core-for-rental',
        label: 'Recommend reserving the core blocks for rental and social housing',
        cost: 1,
        stances: { tenants: 1, owners: -2, merchants: -1, council: 1 },
        ifAdopted: [ind('affordability', 1, 3), fac('owners', -1)],
        ifRejected: [ind('affordability', -1, 3)],
      },
      {
        id: 'allow-condos-with-levy',
        label: 'Recommend allowing condos throughout, with a levy for social housing',
        cost: 0,
        stances: { tenants: -2, owners: 2, merchants: 2, council: 0 },
        ifAdopted: [{ kind: 'capital', delta: 2 }, ind('affordability', -2, 3), ind('legitimacy', -1)],
        ifRejected: [],
      },
    ],
  },

  'overdose-emergency': {
    historicalChoiceId: 'fast-track-response',
    choices: [
      {
        id: 'fast-track-response',
        label: 'Recommend fast-tracking permits for overdose response sites',
        cost: 1,
        stances: { health: 2, tenants: 2, province: 1, merchants: -1 },
        ifAdopted: [ind('safety', 2)],
        ifRejected: [ind('safety', -2), ind('legitimacy', -1)],
      },
      {
        id: 'standard-permitting',
        label: 'Recommend holding to standard permitting',
        cost: 0,
        stances: { health: -2, tenants: -2, merchants: 1 },
        ifAdopted: [ind('safety', -2), ind('legitimacy', -2)],
        ifRejected: [],
      },
    ],
  },

  'balmoral-regent': {
    historicalChoiceId: 'close-and-expropriate',
    choices: [
      {
        id: 'close-and-expropriate',
        label: 'Recommend closing the buildings and expropriating them',
        cost: 3,
        stances: { council: 1, owners: -2, tenants: 0, province: 1, health: 1 },
        ifAdopted: [ind('rooms', -2), ind('safety', 1), ind('rooms', 1, 6)],
        ifRejected: [ind('safety', -2)],
      },
      {
        id: 'repair-in-place',
        label: 'Recommend the city repair the buildings with tenants in place and bill the owner',
        cost: 4,
        stances: { council: -1, owners: -2, tenants: 2, health: 1 },
        ifAdopted: [ind('safety', 1, 2), ind('legitimacy', 2)],
        ifRejected: [ind('safety', -2), ind('legitimacy', 1)],
      },
    ],
  },

  'winters-fire': {
    choices: [
      {
        id: 'fund-fire-safety',
        label: 'Recommend fire system audits of every hotel, with city-funded repairs',
        cost: 3,
        stances: { tenants: 2, owners: 1, health: 1, council: -1 },
        ifAdopted: [ind('safety', 2, 1), ind('legitimacy', 1)],
        ifRejected: [ind('safety', -1), ind('legitimacy', -1)],
      },
      {
        id: 'enforce-with-fines',
        label: 'Recommend stricter inspections and fines on owners',
        cost: 1,
        stances: { tenants: 1, owners: -2, council: 1 },
        ifAdopted: [ind('safety', 1, 2), ind('rooms', -1, 2)],
        ifRejected: [ind('safety', -1)],
      },
    ],
  },

  'hastings-decampment': {
    historicalChoiceId: 'remove-encampment',
    choices: [
      {
        id: 'remove-encampment',
        label: 'Recommend removing the encampment',
        cost: 1,
        stances: { council: 2, merchants: 2, tenants: -2, health: -1 },
        ifAdopted: [ind('safety', -1), ind('legitimacy', -2)],
        ifRejected: [],
      },
      {
        id: 'housing-first',
        label: 'Recommend leaving it until each resident has been offered indoor space',
        cost: 3,
        stances: { council: -2, merchants: -2, tenants: 2, health: 1, province: 0 },
        ifAdopted: [ind('safety', 1), ind('legitimacy', 2)],
        ifRejected: [ind('legitimacy', 1), fac('tenants', 1)],
      },
    ],
  },
}
