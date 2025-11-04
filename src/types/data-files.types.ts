export interface StopData {
  stopId: string; // e.g., "MO123"
  stopName: string; // e.g., "GARIBALDI (dir. Centro)"
  lines: string[]; // e.g., ["1", "7A", "9"]
}

export interface RouteCodes {
  line: string; // e.g., "7A"
  codes: string[]; // e.g., ["728(1)", "729(0)"]
}
