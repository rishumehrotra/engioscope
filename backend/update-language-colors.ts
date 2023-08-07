import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import fetch from 'node-fetch';
import yaml from 'yaml';
import { dirname } from './utils.js';

const run = async () => {
  const response = await fetch(
    'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml'
  );
  const data = yaml.parse(await response.text());
  const result = Object.entries(data as Record<string, { color?: string }>)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, o]) => o.color)
    .reduce(
      (colors, [language, { color }]) => ({
        ...colors,
        [language.toLowerCase()]: color?.toLowerCase(),
      }),
      {}
    );

  await fs.writeFile(
    join(dirname(import.meta.url), 'language-colors.ts'),
    `// This file is autogenerated! Do not modify!
// Run \`npm run update-language-colors\` to update this file.
const languageColors = ${JSON.stringify(result, null, 2)} as const;

export const getLanguageColor = (lang: string) => {
  if (lang in languageColors) return languageColors[lang as keyof typeof languageColors];
  if (lang === 'js') return languageColors.javascript;
  if (lang === 'xml') return languageColors.eiffel;
  return languageColors.eiffel;
};
`,
    'utf8'
  );

  // eslint-disable-next-line no-console
  console.log(`Wrote ${join(dirname(import.meta.url), 'language-colors.ts')}`);
};

await run();
