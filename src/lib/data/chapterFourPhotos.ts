/**
 * Archival photographs for the cards of chapter 4, by stop id (skid-road, rails, library,
 * clearance, freeway, viaducts). Empty for now: nearly every City of Vancouver Archives
 * photograph of 1950-1972 is marked "Under copyright" on its record, so none has yet been
 * confirmed as public domain or clearly licensed. Add entries here as they are confirmed,
 * following chapterThreePhotos.ts. Kept apart from chapterFour.ts so that the photographs can
 * change without touching the map.
 */
import type { Photo } from './stops'

export const chapterFourPhotos: Record<string, Photo[]> = {}
