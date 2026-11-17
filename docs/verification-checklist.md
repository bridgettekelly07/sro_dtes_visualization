# Verification checklist

Eleven of the 37 timeline events are still unverified. This list groups them by where the
answer is, so each trip (browser, library, archive) settles several at once.

An event counts as verified when someone has read the passage that supports its date and
summary. A search result or a second-hand mention does not count.

## How to record a result

For each event, note three things:

1. The source and page (or section heading for a web page).
2. Whether the date and summary below are right, and the correction if not.
3. For events with a "what the city did" option, whether the source confirms it.

Then either tell Claude the three things, or edit the event in
`src/lib/data/chapters.ts` yourself:

```ts
draft('event-id', 1938, 'Title', 'Corrected summary.', 'civil', 'respond', [], {
  verified: true,
  citations: [{ sourceId: 'barnholden-riot', locator: 'pp. 00-00' }],
}),
```

Source ids are listed in `src/lib/data/sources.ts`. A new source needs an entry there first.

Details marked "from memory" below are Claude's recollection, not a checked fact. Treat
them as what to look for, and expect some to be wrong.

---

## A. Public web pages (a few minutes each)

These opened in search results but blocked automated reading. They should open in an
ordinary browser.

### Winters Hotel fire (`winters-fire`, 2022)

- **Where:** BC Coroners Service inquest verdict for the Winters Hotel deaths, on
  gov.bc.ca (search "Winters Hotel inquest verdict coroner"). CBC and Global News covered
  the inquest in January and February 2024.
- **Confirm:** the fire was on 11 April 2022; the hotel was an SRO at 203 Abbott Street in
  Gastown; two residents died.
- **Also look for:** whether sprinklers and alarms were working, since that bears on the
  "fund fire safety" recommendation. (Search summaries say they were not; unread.)
- **Already known:** the City's 2023 survey lists the building as demolished (PDF p. 50).

### Hastings Street decampment (`hastings-decampment`, 2023)

- **Where:** City of Vancouver news release or council material from April 2023 (search
  "East Hastings encampment April 2023 City of Vancouver").
- **Confirm:** the date (5 April 2023, from memory); that City staff and police carried it
  out; what shelter or housing was offered.
- **Choice to confirm:** "Recommend removing the encampment" as what the city did.

### Woodward's squat (`woodsquat`, 2002)

- **Where:** CBC, "20 years after Woodsquat" (September 2022). Also Blomley, section C.
- **Confirm:** the occupation began 14 September 2002 and lasted about three months; how
  it ended.
- **Already known:** the City's April 2003 report confirms the Province owned the building
  in 2002 and the City bought it afterwards.

### Woodward's redevelopment (`olympics-woodwards`, 2010)

- **Where:** City of Vancouver's Woodward's project page or council reports from 2009 and
  2010; the developer's and architect's project pages for unit counts.
- **Confirm:** the opening date; the mix of market condos, social housing and other uses.
- **Already known:** the City's 2015 survey (PDF p. 53) lists two non-market components
  completed in 2010, with 125 singles units and 75 family units.
- **Choice to confirm:** "mixed project with market condos funding social housing".
- **Decide:** whether the Olympics belong in this event at all. Nothing read so far links
  the two beyond the shared year.

### VANDU founded (`vandu`, 1998)

- **Where:** VANDU's own account of its history (vandu.org), or section C.
- **Confirm:** the founding year. Online sources split between 1997 and 1998; the group may
  have begun meeting in 1997 and incorporated in 1998, which would explain both.

---

## B. Online databases and archives

### Hotel construction peaks (`hotel-construction`, 1900 to 1914)

This is a pattern, not a single fact, so it needs a small sample.

- **Where:** Heritage Vancouver's Historic Building Permits Database (free, online).
  Hotel names and addresses are in the City's 2023 survey, Appendix (PDF pp. 36 to 50).
- **Do:** look up the permit year for 15 to 20 hotels still open today, spread along
  Hastings, Carrall, Powell and Main.
- **Confirm:** that most were built between 1900 and 1914. Record the sample and its years.
- **Second check:** the 1912 Goad fire insurance plan on the Vancouver Open Data Portal
  shows which of these buildings existed by 1912.

### Hastings Mill established (`hastings-mill`, 1865)

- **Where:** City of Vancouver Archives (Major Matthews, *Early Vancouver*, searchable
  online); *Encyclopedia of British Columbia*, "Hastings Mill" (through the UBC Library).
- **Confirm:** the year. Sources split between 1865 (the company or site established) and
  1867 (the mill begins cutting). Pick the one the source supports and say which it is.
- **Already known:** The Canadian Encyclopedia confirms a sawmill was operating on the
  inlet by 1867, under the name British Columbia and Vancouver Island Spar, Lumber and
  Sawmill Company.

### DERA founded (`dera-founded`, 1973)

- **Where:** the Downtown Eastside Residents' Association fonds description at the City of
  Vancouver Archives (the administrative history states the founding). Also Hasson and
  Ley, section C.
- **Confirm:** founded 1973; that the association promoted the name "Downtown Eastside" in
  place of "Skid Road".
- **Already known:** the City's 2007 survey (PDF p. 58) confirms the association was
  pressing the City about hotel conditions by 1978.

---

## C. Books (UBC Library)

### Hasson and Ley, *Neighbourhood Organizations and the Welfare State* (1994)

Look for the chapters on Strathcona and on the Downtown Eastside.

| Event | Confirm |
|---|---|
| `strathcona-clearance` | Council approved the redevelopment plan in 1958 (from memory); when clearance ended; how many people were displaced |
| `dera-founded` | Founding year 1973 and who founded it; the renaming of the neighbourhood |
| `freeway-fight` (second citation) | The association formed in 1968 (from memory); whether City planners recommended the freeway route, which is the unverified "what the city did" |

### Kay Anderson, *Vancouver's Chinatown* (1991)

Look for the chapter on urban renewal, roughly 1950 to 1970.

| Event | Confirm |
|---|---|
| `strathcona-clearance` | The 1958 start, the phases of clearance, and the end date |
| `riot-1907` (second citation) | Date and course of the riot |

### Michael Barnholden, *Reading the Riot Act* (2005)

| Event | Confirm |
|---|---|
| `post-office-sit-in` | The occupation began in May 1938 at the post office and other buildings, and police cleared the post office on 19 June 1938 (both from memory); what the City did |
| `on-to-ottawa` (second citation) | The April 1935 strike and the 3 June departure |

### Campbell, Boyd and Culbert, *A Thousand Dreams* (2009)

| Event | Confirm |
|---|---|
| `health-emergency-1997` | The year, and ideally the month, the Vancouver/Richmond Health Board declared the emergency |
| `vandu` | Founding year |
| `insite` (choice) | That the City supported the site, which is the unverified "what the city did" |

### Nicholas Blomley, *Unsettling the City* (2004)

| Event | Confirm |
|---|---|
| `woodsquat` | Dates of the occupation and how it ended |
| `woodwards-closes` (second citation) | The 1993 closure and what followed |

---

## Worth a second citation

These are verified, but rest on one encyclopedia entry or carry a caveat on their card:

- **`uprooting-1942`**: the source covers the coast-wide removal. Its effect on Powell
  Street needs the Nikkei National Museum or the Landscapes of Injustice project.
- **`expo-evictions`**: the City report quotes Kris Olds for the 700 to 1,000 estimate.
  Confirm it in Olds's own article.
- **`balmoral-regent`**: the City's 2020 report gives two different pairs of closure years.
  A news report or council minute from the time would settle which is right.
- **`viaducts`**: the 1972 opening date was dropped as unconfirmed. Wayde Compton's
  *After Canaan* is the listed source.

## Not events, but also unverified

- **Office titles** on chapters 3 to 8 ("Town Planning Commission", "City Planning
  Department", "Planning, Urban Design and Sustainability"). The City of Vancouver Archives
  holds the planning department's records, with dates for each body.
- **"What the city did"** on ten events. Each is flagged on its card in the app.
