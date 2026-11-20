/**
 * A hotel as something the map can go to: its footprint and height, its photograph, its fronts, and the
 * few facts the project holds about it. Used where a card follows one hotel (a side story).
 */
import type { Pickable } from './stops'
import sroByYear from './sroByYear.json'
import sroHeritage from './sroHeritage.json'
import { hotelPhotos } from './hotelPhotos'
import { hotelFronts } from './hotelFronts'

type Row = { name: string; addr: string; built: number | null; lon: number; lat: number; parts: { ring: [number, number][]; h: number }[] }
const rows = sroByYear.buildings as unknown as Row[]
const heritage = sroHeritage.buildings as Record<string, { group: string; designated: boolean }>

export function pickOf(name: string): Pickable {
  const h = rows.find((r) => r.name === name)
  if (!h) throw new Error(`No SRO building named ${name}`)
  const reg = heritage[name]
  return {
    name: name.replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase()),
    lon: h.lon,
    lat: h.lat,
    parts: h.parts.map((p) => ({ ring: p.ring, h: p.h })),
    photo: hotelPhotos[name],
    front: hotelFronts[name]?.front,
    facts: [
      { label: 'Address', value: h.addr },
      ...(h.built ? [{ label: 'Built', value: `${h.built}, by the lot's property record` }] : []),
      ...(reg ? [{ label: 'Heritage', value: `On the City's register, class ${reg.group}${reg.designated ? ', and designated' : ''}` }] : []),
    ],
    note: hotelFronts[name]?.read,
  }
}
