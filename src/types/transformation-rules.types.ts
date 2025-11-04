import type {
  SetaArrivalService,
  SetaVehicleProperties,
} from './seta-api.types';

export interface TransformationConditions {
  [key: string]: string | number | undefined;
}
export interface TransformationMutations {
  [key: string]: string | number;
}

export interface TransformationRule {
  conditions: TransformationConditions;
  mutations: TransformationMutations;
}

export interface ModelRuleRange {
  range: [number, number];
  model: string;
  plate_prefix?: string;
}

export interface ModelRuleExact {
  exact: number;
  model: string;
  plate_prefix?: string;
}

export type ModelRule = ModelRuleRange | ModelRuleExact;

export interface TransformationRulesData {
  arrival_rules: TransformationRule[];
  bus_rules: TransformationRule[];
  model_rules: ModelRule[];
}

export type Arrival = SetaArrivalService;
export type Bus = SetaVehicleProperties;
