import { db } from './firebase';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';

export const TERRITORY_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
];

export interface Territory {
  id: string;
  name: string;
  polygonCoordinates: [number, number][];
  ownerSquad: string;
  health: number;
  activePlayers: number;
  colorIndex: number;
}

// Generate 25 territories around a center point (e.g., San Francisco)
const CENTER_LAT = 37.7749;
const CENTER_LNG = -122.4194;
const CELL_SIZE = 0.009; // roughly 1km

export function generateTerritories(): Territory[] {
  const territories: Territory[] = [];
  let idCounter = 1;

  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      const baseLat = CENTER_LAT + y * CELL_SIZE;
      const baseLng = CENTER_LNG + x * CELL_SIZE;

      // Create an irregular polygon (4 corners with some random perturbation)
      const perturb = () => (Math.random() - 0.5) * 0.004;

      const coords: [number, number][] = [
        [baseLat - CELL_SIZE/2 + perturb(), baseLng - CELL_SIZE/2 + perturb()],
        [baseLat - CELL_SIZE/2 + perturb(), baseLng + CELL_SIZE/2 + perturb()],
        [baseLat + CELL_SIZE/2 + perturb(), baseLng + CELL_SIZE/2 + perturb()],
        [baseLat + CELL_SIZE/2 + perturb(), baseLng - CELL_SIZE/2 + perturb()],
      ];

      territories.push({
        id: `territory-${idCounter}`,
        name: `Sector ${String.fromCharCode(65 + y + 2)}${x + 3}`,
        polygonCoordinates: coords,
        ownerSquad: '',
        health: 1000,
        activePlayers: 0,
        colorIndex: idCounter % 5,
      });
      idCounter++;
    }
  }
  return territories;
}

export async function initializeTerritoriesIfEmpty() {
  const snapshot = await getDocs(collection(db, 'territories'));
  if (snapshot.empty) {
    const batch = writeBatch(db);
    const territories = generateTerritories();
    territories.forEach(t => {
      const ref = doc(db, 'territories', t.id);
      batch.set(ref, {
        ...t,
        polygonCoordinates: JSON.stringify(t.polygonCoordinates)
      });
    });
    await batch.commit();
  }
}

// Ray-casting algorithm to check if point is inside polygon
export function isPointInPolygon(point: [number, number], vs: [number, number][]) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
