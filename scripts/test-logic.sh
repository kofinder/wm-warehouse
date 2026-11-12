#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
TSC="./node_modules/.bin/tsc"
if [[ ! -x "$TSC" ]]; then TSC="$(command -v tsc)"; fi
"$TSC" src/simulation/model.ts --target ES2020 --module commonjs --moduleResolution node --outDir "$TMP" --strict --skipLibCheck
node - "$TMP/model.js" <<'JS'
const assert = require('node:assert/strict');
const m = require(process.argv[2]);
let state = m.initialSimulation();
assert.equal(m.SLOTS.length, 48);
assert.equal(state.inventory.length, 18);
assert.equal(new Set(state.inventory.map(x=>x.slotId)).size,18);
const empty = m.SLOTS.find(s=>!state.inventory.some(p=>p.slotId===s.id));
const occupied = state.inventory[0].slotId;
assert.throws(()=>m.createTask(state,'RETRIEVAL',empty.id));
assert.throws(()=>m.createTask(state,'PUTAWAY',occupied));
state = m.createTask(state,'PUTAWAY',empty.id);
assert.throws(()=>m.createTask(state,'PUTAWAY',empty.id));
for(let i=0;i<150;i++) state=m.advanceSimulation(state,0.1);
assert.equal(state.inventory.length,19);
assert.equal(state.tasks[0].status,'COMPLETED');
state = m.createTask(state,'RETRIEVAL',empty.id);
for(let i=0;i<150;i++) state=m.advanceSimulation(state,0.1);
assert.equal(state.inventory.length,18);
assert.equal(state.tasks[0].status,'COMPLETED');
assert.ok(!state.inventory.some(p=>p.slotId===empty.id));
state = {...state, running:false};
assert.equal(m.advanceSimulation(state, 1),state);
console.log('PASS: 48 slots, inventory, validation, duplicate prevention, putaway, retrieval, pause');
JS
