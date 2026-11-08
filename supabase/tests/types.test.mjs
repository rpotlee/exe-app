import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate } from '../../scripts/gen-types.mjs';
test('src/db/types.ts matches the schema (run `npm run gen:types` after changing a migration)', async () => {
  const committed = readFileSync(new URL('../../src/db/types.ts', import.meta.url), 'utf8');
  assert.equal(committed, await generate());
});
