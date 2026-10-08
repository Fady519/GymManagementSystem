// Checks that every language file has exactly the same message keys as English.
// A missing Arabic key would show the raw key on the page, so this runs in `npm run lint`.
import { readFileSync } from "node:fs";

const load = (locale) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url)));

/** Flattens {"Home": {"title": "..."}} into ["Home.title"]. */
function keysOf(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === "object" ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

const reference = new Set(keysOf(load("en")));
let failed = false;

for (const locale of ["ar"]) {
  const keys = new Set(keysOf(load(locale)));
  const missing = [...reference].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !reference.has(k));

  if (missing.length || extra.length) {
    failed = true;
    if (missing.length) console.error(`${locale}.json is missing:\n  ${missing.join("\n  ")}`);
    if (extra.length) console.error(`${locale}.json has keys English doesn't:\n  ${extra.join("\n  ")}`);
  }
}

if (failed) process.exit(1);
console.log(`Messages OK: ${reference.size} keys in every language.`);
