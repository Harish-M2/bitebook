/**
 * Fixture provider — a fixed, offline list of restaurants.
 *
 * Exists so the log-a-dish flow can be built and exercised end to end before anyone enables
 * billing on a real provider account, and so automated tests never depend on a paid API
 * being reachable. It implements exactly the same interface as the real provider, so code
 * that works against it works against Google unchanged.
 *
 * Its rows are written with source `seed` rather than `google_places`. That is not cosmetic:
 * it keeps fixture data out of the unique key that real imports deduplicate on, so a place
 * imported for real later is never mistaken for the fake one, and it makes fixture rows
 * trivially identifiable in the database if they ever reach an environment they shouldn't.
 */

import type {
  NormalisedPlace,
  PlaceSearchParams,
  PlacesProvider,
} from './types.ts';

interface FixtureSeed {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  priceLevel: number;
  phone: string;
  websiteUrl: string;
  /** Matched against the query in addition to the name, so "curry" finds Dishoom. */
  keywords: string[];
  /**
   * Stated outright rather than inferred from the keywords. These eight are hand-written,
   * so guessing at them would only test the guesser; the point of the fixture is to feed
   * the import path data of the same shape the real provider produces.
   */
  cuisineSlugs: string[];
}

const FIXTURES: FixtureSeed[] = [
  {
    id: 'fixture-dishoom-shoreditch',
    name: 'Dishoom Shoreditch',
    address: '7 Boundary St, London E2 7JE',
    city: 'London',
    latitude: 51.5245,
    longitude: -0.0754,
    priceLevel: 2,
    phone: '020 7420 9324',
    websiteUrl: 'https://www.dishoom.com',
    keywords: ['indian', 'curry', 'bombay', 'breakfast'],
    cuisineSlugs: ['indian'],
  },
  {
    id: 'fixture-padella-borough',
    name: 'Padella',
    address: '6 Southwark St, London SE1 1TQ',
    city: 'London',
    latitude: 51.5055,
    longitude: -0.0906,
    priceLevel: 2,
    phone: '020 7952 4482',
    websiteUrl: 'https://www.padella.co',
    keywords: ['italian', 'pasta', 'pici', 'cacio e pepe'],
    cuisineSlugs: ['italian'],
  },
  {
    id: 'fixture-bao-soho',
    name: 'BAO Soho',
    address: '53 Lexington St, London W1F 9AS',
    city: 'London',
    latitude: 51.5131,
    longitude: -0.1373,
    priceLevel: 2,
    phone: '020 3011 1632',
    websiteUrl: 'https://baolondon.com',
    keywords: ['taiwanese', 'bao', 'buns', 'asian'],
    // The taxonomy has no Taiwanese entry and Taiwanese is not Chinese. Left empty on the
    // same rule the mapper follows: a wrong chip is worse than a missing one.
    cuisineSlugs: [],
  },
  {
    id: 'fixture-smoking-goat',
    name: 'Smoking Goat',
    address: '64 Shoreditch High St, London E1 6JJ',
    city: 'London',
    latitude: 51.5241,
    longitude: -0.0776,
    priceLevel: 3,
    phone: '020 3818 9160',
    websiteUrl: 'https://www.smokinggoatbar.com',
    keywords: ['thai', 'bbq', 'spicy', 'asian'],
    cuisineSlugs: ['thai'],
  },
  {
    id: 'fixture-st-john-smithfield',
    name: 'St. JOHN Smithfield',
    address: '26 St John St, London EC1M 4AY',
    city: 'London',
    latitude: 51.5203,
    longitude: -0.1013,
    priceLevel: 4,
    phone: '020 7251 0848',
    websiteUrl: 'https://stjohnrestaurant.com',
    keywords: ['british', 'nose to tail', 'roast'],
    cuisineSlugs: ['british'],
  },
  {
    id: 'fixture-mildreds-camden',
    name: "Mildreds Camden",
    address: '9 Jamestown Rd, London NW1 7BW',
    city: 'London',
    latitude: 51.5395,
    longitude: -0.1447,
    priceLevel: 2,
    phone: '020 7482 4200',
    websiteUrl: 'https://www.mildreds.co.uk',
    keywords: ['vegetarian', 'vegan', 'plant based'],
    // Vegetarian is a diet, not a cuisine, and the taxonomy has no entry for it. Also
    // exercises the "provider says nothing useful" path through the import.
    cuisineSlugs: [],
  },
  {
    id: 'fixture-bundobust-manchester',
    name: 'Bundobust',
    address: '61 Piccadilly, Manchester M1 2AG',
    city: 'Manchester',
    latitude: 53.4813,
    longitude: -2.2338,
    priceLevel: 1,
    phone: '0161 359 6757',
    websiteUrl: 'https://www.bundobust.com',
    keywords: ['indian', 'vegetarian', 'street food', 'beer'],
    cuisineSlugs: ['indian'],
  },
  {
    id: 'fixture-ottolenghi-islington',
    name: 'Ottolenghi Islington',
    address: '287 Upper St, London N1 2TZ',
    city: 'London',
    latitude: 51.5407,
    longitude: -0.1029,
    priceLevel: 3,
    phone: '020 7288 1454',
    websiteUrl: 'https://ottolenghi.co.uk',
    keywords: ['middle eastern', 'mediterranean', 'salads', 'brunch'],
    cuisineSlugs: ['middle-eastern', 'mediterranean'],
  },
];

function toNormalised(fixture: FixtureSeed): NormalisedPlace {
  return {
    externalPlaceId: fixture.id,
    name: fixture.name,
    address: fixture.address,
    city: fixture.city,
    latitude: fixture.latitude,
    longitude: fixture.longitude,
    priceLevel: fixture.priceLevel,
    phone: fixture.phone,
    websiteUrl: fixture.websiteUrl,
    imageUrl: null,
    cuisineSlugs: fixture.cuisineSlugs,
    raw: { ...fixture, bitebookFixture: true },
  };
}

/** Rough great-circle distance in metres. Good enough to order eight fixed points. */
function distanceMetres(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export class FixturePlacesProvider implements PlacesProvider {
  readonly source = 'seed';

  search(params: PlaceSearchParams): Promise<NormalisedPlace[]> {
    const needle = params.query.trim().toLowerCase();

    let matches = needle.length === 0
      ? [...FIXTURES]
      : FIXTURES.filter(
        (f) =>
          f.name.toLowerCase().includes(needle) ||
          f.city.toLowerCase().includes(needle) ||
          f.keywords.some((k) => k.includes(needle)),
      );

    // Mirror the real provider's location bias, so a caller that only ever sees fixtures
    // still exercises the code path that passes coordinates through.
    if (params.latitude != null && params.longitude != null) {
      const lat = params.latitude;
      const lng = params.longitude;
      matches = matches.sort(
        (a, b) =>
          distanceMetres(lat, lng, a.latitude, a.longitude) -
          distanceMetres(lat, lng, b.latitude, b.longitude),
      );
    }

    return Promise.resolve(
      matches.slice(0, params.limit ?? 10).map(toNormalised),
    );
  }

  details(externalPlaceId: string): Promise<NormalisedPlace | null> {
    const match = FIXTURES.find((f) => f.id === externalPlaceId);
    return Promise.resolve(match ? toNormalised(match) : null);
  }
}
