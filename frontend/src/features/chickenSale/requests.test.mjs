import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsCommand, saveErrorMessage } from './requests.js';
test('settings sends only editable fields, excluding null closing counts and stale version', () => {
  const result = settingsCommand({ city: ' Jalandhar ', rawFactor: '1.6', targetMargin: 20, expectedSalesKg: 50, labor: '500', rent: 0, countedRawKg: null, countedDressedKg: null, entries: [{}], version: 5 });
  assert.deepEqual(result, { action: 'settings', city: 'Jalandhar', rawFactor: 1.6, targetMargin: 20, expectedSalesKg: 50, labor: 500, rent: 0 });
});
test('ASP.NET validation errors are shown instead of a connection error', () => {
  assert.equal(saveErrorMessage({response:{status:400,data:{errors:{'$.countedRawKg':['Cannot convert null to decimal.']}}}}), '$.countedRawKg: Cannot convert null to decimal.');
  assert.equal(saveErrorMessage({response:{status:409,data:{message:'Refresh before saving.'}}}), 'Refresh before saving.');
  assert.match(saveErrorMessage({response:{status:500}}), /HTTP 500/);
  assert.match(saveErrorMessage({}), /reach the server/);
});
