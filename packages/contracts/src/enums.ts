export const sentimentLabels = ["BULLISH", "NEUTRAL", "BEARISH"] as const;
export type SentimentLabel = (typeof sentimentLabels)[number];

export const optionSides = ["buy", "sell"] as const;
export type OptionSide = (typeof optionSides)[number];

export const optionTypes = ["call", "put"] as const;
export type OptionType = (typeof optionTypes)[number];
