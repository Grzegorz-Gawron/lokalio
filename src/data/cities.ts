import type { LatLng } from '../types';
import { haversineKm } from '../lib/geo';

export interface CityDistrict {
  id: string;
  label: string; // nazwa miejsca/dzielnicy do pokazania
  district: string; // nazwa dzielnicy
  coords: LatLng;
}

export interface City {
  id: string;
  name: string;
  region: string;
  population: number;
  center: LatLng;
  // Dzielnice TYLKO dla miast > 100 tys. mieszkańców. Dla mniejszych: pusta lista.
  districts: CityDistrict[];
}

// Kolejność = kolejność na liście. Sandomierz pierwszy (pilotaż).
export const CITIES: City[] = [
  {
    id: 'sandomierz',
    name: 'Sandomierz',
    region: 'świętokrzyskie',
    population: 23000,
    center: { lat: 50.6789, lng: 21.7497 },
    districts: [],
  },
  {
    id: 'tarnobrzeg',
    name: 'Tarnobrzeg',
    region: 'podkarpackie',
    population: 46000,
    center: { lat: 50.5731, lng: 21.6798 },
    districts: [],
  },
  {
    id: 'stalowa-wola',
    name: 'Stalowa Wola',
    region: 'podkarpackie',
    population: 57000,
    center: { lat: 50.5826, lng: 22.0533 },
    districts: [],
  },
  {
    id: 'opatow',
    name: 'Opatów',
    region: 'świętokrzyskie',
    population: 6000,
    center: { lat: 50.7997, lng: 21.4253 },
    districts: [],
  },
  {
    id: 'krakow',
    name: 'Kraków',
    region: 'małopolskie',
    population: 800000,
    center: { lat: 50.0617, lng: 19.9373 },
    districts: [
      { id: 'k-rynek', label: 'Rynek Główny', district: 'Stare Miasto', coords: { lat: 50.0617, lng: 19.9373 } },
      { id: 'k-kazimierz', label: 'Kazimierz', district: 'Kazimierz', coords: { lat: 50.0515, lng: 19.9447 } },
      { id: 'k-podgorze', label: 'Podgórze', district: 'Podgórze', coords: { lat: 50.0462, lng: 19.9525 } },
      { id: 'k-grzegorzki', label: 'Grzegórzki', district: 'Grzegórzki', coords: { lat: 50.0647, lng: 19.9558 } },
      { id: 'k-nowahuta', label: 'Plac Centralny', district: 'Nowa Huta', coords: { lat: 50.0719, lng: 20.0378 } },
    ],
  },
];

export const DEFAULT_CITY_ID = 'sandomierz';

// Na start pomijamy w wyborze miasta poniżej 20 tys. mieszkańców.
export const SELECTABLE_CITIES = CITIES.filter((c) => c.population >= 20000);

export const cityById = (id: string): City => CITIES.find((c) => c.id === id) ?? CITIES[0];

/** Czy miasto ma dzielnice (powyżej 100 tys. mieszkańców). */
export const cityHasDistricts = (city: City): boolean => city.population >= 100000;

/** Miasto, którego centrum jest najbliżej podanego punktu. */
export function nearestCity(coords: LatLng): City {
  return CITIES.reduce((best, c) =>
    haversineKm(coords, c.center) < haversineKm(coords, best.center) ? c : best,
  CITIES[0]);
}

/** Do którego miasta „należy" punkt (po najbliższym centrum). */
export const cityIdOf = (coords: LatLng): string => nearestCity(coords).id;
