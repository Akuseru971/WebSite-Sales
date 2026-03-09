const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  quot: '"',
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  eacute: "e",
  egrave: "e",
  ecirc: "e",
  agrave: "a",
  acirc: "a",
  ccedil: "c",
  ucirc: "u",
  ugrave: "u",
  ocirc: "o",
  oelig: "oe",
  aelig: "ae",
};

export function decodeHtmlEntities(input: string): string {
  if (!input) {
    return input;
  }

  const namedDecoded = input.replace(/&([a-zA-Z]+);/g, (match, name) => {
    const lowered = String(name).toLowerCase();
    return NAMED_ENTITIES[lowered] ?? match;
  });

  const numericDecoded = namedDecoded
    .replace(/&#(\d+);/g, (match, code) => {
      const value = Number.parseInt(code, 10);
      if (!Number.isFinite(value)) {
        return match;
      }

      try {
        return String.fromCodePoint(value);
      } catch {
        return match;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (match, code) => {
      const value = Number.parseInt(code, 16);
      if (!Number.isFinite(value)) {
        return match;
      }

      try {
        return String.fromCodePoint(value);
      } catch {
        return match;
      }
    });

  return numericDecoded.replace(/\s+/g, " ").trim();
}

export function deepDecodeHtmlEntities<T>(value: T): T {
  if (typeof value === "string") {
    return decodeHtmlEntities(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepDecodeHtmlEntities(item)) as T;
  }

  if (value && typeof value === "object") {
    const inputRecord = value as Record<string, unknown>;
    const outputRecord: Record<string, unknown> = {};

    Object.entries(inputRecord).forEach(([key, entry]) => {
      outputRecord[key] = deepDecodeHtmlEntities(entry);
    });

    return outputRecord as T;
  }

  return value;
}
