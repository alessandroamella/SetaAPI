export interface Feature<T> {
  type: 'Feature';
  properties: T;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface FeatureCollection<T> {
  type: 'FeatureCollection';
  features: Feature<T>[];
}

// Properties for a vehicle/bus from the /vehicles/map endpoint
export interface SetaVehicleProperties {
  vehicle_code: number;
  linea: string;
  route_desc: string;
  plate_num: string;
  model?: string; // We will add this property
  reached_waypoint_code?: string;
  wp_desc?: string;
  route_code?: string;
}

export type SetaVehicleResponse = FeatureCollection<SetaVehicleProperties>;

// Structure for the /arrival/:id endpoint
export interface SetaArrivalService {
  service: string;
  destination: string;
  arrival: string; // e.g., "14:30"
  type: 'planned' | 'realtime';
  codice_corsa: string;
  delay?: number; // We will add this
}

export interface SetaArrivalResponse {
  arrival: {
    services: SetaArrivalService[];
    error?: string;
  };
}
