import type { LocalizedText } from "../shared/locale";
import type { Money } from "../shared/money";

export type OptionGroupId = string & { readonly __brand: "OptionGroupId" };
export type OptionId = string & { readonly __brand: "OptionId" };

export type Option = Readonly<{
  id: OptionId;
  code: string;
  name: LocalizedText;
  priceDelta: Money;
  isAvailable: boolean;
  sort: number;
}>;

export type OptionGroup = Readonly<{
  id: OptionGroupId;
  code: string;
  name: LocalizedText;
  selection: "single" | "multiple";
  required: boolean;
  sort: number;
  options: readonly Option[];
  defaultOptionId: OptionId | null;
}>;
