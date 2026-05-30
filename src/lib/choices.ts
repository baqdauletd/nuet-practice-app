import type { ChoiceMap } from "./types";

export type ChoiceEntry = {
  label: string;
  text: string;
};

function normalizeChoiceValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeChoices(
  value: Record<string, unknown> | null | undefined,
): ChoiceEntry[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).map(([label, text]) => ({
    label,
    text: normalizeChoiceValue(text),
  }));
}

export function choicesArrayToRecord(
  choices: ChoiceEntry[],
): ChoiceMap | null {
  const nextChoices: ChoiceMap = {};

  for (const choice of choices) {
    const label = choice.label.trim();
    if (!label) {
      continue;
    }

    nextChoices[label] = choice.text.trim();
  }

  return Object.keys(nextChoices).length > 0 ? nextChoices : null;
}

export function getChoiceLabels(choices: ChoiceEntry[]) {
  return choices
    .map((choice) => choice.label.trim())
    .filter(Boolean);
}

export function getChoiceEntries(
  choices: Record<string, string> | null | undefined,
) {
  return normalizeChoices(choices);
}
