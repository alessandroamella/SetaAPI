import transformationRules from '../data/transformation-rules.json';
import type {
  Arrival,
  Bus,
  ModelRule,
  TransformationConditions,
  TransformationRule,
  TransformationRulesData,
} from '../types/transformation-rules.types';

type RuleItem = Arrival | Bus;

export class TransformationService {
  private rules: TransformationRulesData = {
    arrival_rules: [],
    bus_rules: [],
    model_rules: [],
  };

  public async initialize(): Promise<void> {
    this.rules = transformationRules as TransformationRulesData;
  }

  public transformArrival(arrival: Arrival): Arrival {
    return this.applyRules(arrival, this.rules.arrival_rules);
  }

  public transformBus(bus: Bus): Bus {
    let transformed = this.applyRules(bus, this.rules.bus_rules);
    transformed = this.applyModelRules(transformed);
    return transformed;
  }

  private applyRules<T extends RuleItem>(
    item: T,
    ruleSet: TransformationRule[],
  ): T {
    for (const rule of ruleSet) {
      if (this.matchesConditions(item, rule.conditions)) {
        Object.assign(item, rule.mutations);
      }
    }
    return item;
  }

  private matchesConditions(
    item: RuleItem,
    conditions: TransformationConditions,
  ): boolean {
    for (const [key, conditionValue] of Object.entries(conditions)) {
      if (key.endsWith('_includes')) {
        const actualKey = key.replace('_includes', '');
        // biome-ignore lint/suspicious/noExplicitAny: dynamic key access
        const itemValue = (item as any)[actualKey];

        if (
          !itemValue ||
          typeof itemValue !== 'string' ||
          !itemValue.includes(String(conditionValue))
        ) {
          return false;
        }
        // biome-ignore lint/suspicious/noExplicitAny: dynamic key access
      } else if ((item as any)[key] !== conditionValue) {
        return false;
      }
    }
    return true;
  }

  private applyModelRules(bus: Bus): Bus {
    const vehicleCode = bus.vehicle_code;

    for (const rule of this.rules.model_rules) {
      if (this.isModelRuleMatch(vehicleCode, rule)) {
        bus.model = rule.model;

        if (rule.plate_prefix) {
          bus.plate_num = `${rule.plate_prefix}${bus.vehicle_code}`;
        }

        break; // First match wins
      }
    }

    return bus;
  }

  private isModelRuleMatch(vehicleCode: number, rule: ModelRule): boolean {
    if ('range' in rule) {
      const [min, max] = rule.range;
      return vehicleCode >= min && vehicleCode <= max;
    }

    if ('exact' in rule) {
      return vehicleCode === rule.exact;
    }

    return false;
  }
}
