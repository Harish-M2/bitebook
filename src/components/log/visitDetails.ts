import type { SeatingType, VisitDetailsInput } from '@/lib/db/log';

/** Form state for the optional visit extras; money and counts stay strings while typing. */
export type VisitDetailsDraft = {
  foodRating: number;
  serviceRating: number;
  atmosphereRating: number;
  valueRating: number;
  spendBand: number | null;
  partySize: string;
  seatingType: SeatingType | null;
};

export const EMPTY_VISIT_DETAILS: VisitDetailsDraft = {
  foodRating: 0,
  serviceRating: 0,
  atmosphereRating: 0,
  valueRating: 0,
  spendBand: null,
  partySize: '',
  seatingType: null,
};

export const SEATING_OPTIONS: { value: SeatingType; label: string }[] = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'bar', label: 'Bar' },
  { value: 'takeaway', label: 'Takeaway' },
];

export const SPEND_BANDS = [1, 2, 3, 4] as const;

export function isValidSpendBand(value: number | null): boolean {
  return value === null || SPEND_BANDS.includes(value as (typeof SPEND_BANDS)[number]);
}

export function isValidPartySize(value: string): boolean {
  if (value.trim() === '') return true;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100;
}

export function toVisitDetailsInput(d: VisitDetailsDraft): VisitDetailsInput {
  return {
    foodRating: d.foodRating >= 0.5 ? d.foodRating : undefined,
    serviceRating: d.serviceRating >= 0.5 ? d.serviceRating : undefined,
    atmosphereRating: d.atmosphereRating >= 0.5 ? d.atmosphereRating : undefined,
    valueRating: d.valueRating >= 0.5 ? d.valueRating : undefined,
    spendBand: d.spendBand !== null && isValidSpendBand(d.spendBand) ? d.spendBand : undefined,
    partySize: d.partySize.trim() && isValidPartySize(d.partySize) ? Number(d.partySize) : undefined,
    seatingType: d.seatingType ?? undefined,
  };
}
