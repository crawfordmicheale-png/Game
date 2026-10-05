const test = require('node:test');
const assert = require('node:assert');
require('../js/data.js');
require('../js/creature.js');
require('../js/battle.js');
const CF = globalThis.CF;

// Deterministic RNG so tests are repeatable.
function seed(s) {
  CF.rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('evolution web has 6 / 12 / 24 / 48 forms with unique names', () => {
  assert.deepStrictEqual([0, 1, 2, 3].map((s) => CF.formsAtStage(s).length), [6, 12, 24, 48]);
  const names = Object.values(CF.FORMS).map((f) => f.name);
  assert.strictEqual(new Set(names).size, names.length);
});

// Raise a creature with a fixed routine and fight with a fixed style.
function raise(hatchling, { train, discipline, style, neglect }) {
  const c = CF.createCreature(hatchling);
  for (let day = 0; day < 30 && c.stage < 3; day++) {
    if (c.event) CF.resolveEvent(c, discipline ? 'scold' : 'indulge');
    if (neglect) {
      CF.perform(c, 'train-' + train);
      CF.perform(c, 'train-' + train);
    } else {
      CF.perform(c, 'meal');
      CF.perform(c, c.needs.energy < 45 ? 'rest' : 'train-' + train);
      if (c.stage >= 1 && CF.totalBattles(c) < 8) {
        const r = CF.startBattle(c, 'rookie');
        const b = r.battle;
        const moves = style === 'aggressive' ? ['strike', 'frenzy'] : ['focus', 'strike', 'feint', 'guard'];
        let i = 0;
        while (!b.over && i < 60) b.choose(moves[i++ % moves.length]);
        if (!b.over) b.forfeit();
        CF.applyBattleResult(c, b);
      } else CF.perform(c, c.needs.energy < 50 ? 'rest' : 'train-heart');
      CF.perform(c, c.needs.hygiene < 60 ? 'clean' : discipline ? 'meal' : 'treat');
    }
    if (c.sick) { c.ap++; CF.perform(c, 'medicine'); }
    CF.endDay(c);
  }
  return c;
}

test('identical hatchlings diverge when raised differently', () => {
  seed(1);
  const a = raise('emberling', { train: 'wit', discipline: true, style: 'tactical' });
  const b = raise('emberling', { train: 'might', discipline: false, style: 'aggressive' });
  assert.strictEqual(a.stage, 3);
  assert.strictEqual(b.stage, 3);
  assert.notStrictEqual(a.formId, b.formId);
  assert.strictEqual(CF.FORMS[a.formId].trait, 'wit');
  assert.strictEqual(CF.FORMS[b.formId].trait, 'might');
});

test('different hatchlings converge when raised the same way', () => {
  seed(2);
  const routine = { train: 'swift', discipline: true, style: 'aggressive' };
  const a = raise('pebblit', routine);
  const b = raise('tidepup', routine);
  assert.strictEqual(a.stage, 3);
  assert.strictEqual(a.formId, b.formId);
  assert.notStrictEqual(a.element, b.element);
});

test('cannot battle before the first evolution', () => {
  const c = CF.createCreature('sparkit');
  assert.strictEqual(CF.canBattle(c).ok, false);
});

test('evolution to stage 2 requires battles', () => {
  seed(3);
  const c = CF.createCreature('zephlet');
  for (let i = 0; i < 12; i++) {
    CF.perform(c, 'meal');
    CF.perform(c, 'train-swift');
    CF.endDay(c);
    c.event = null;
  }
  assert.strictEqual(c.stage, 1);
  assert.ok(!CF.evolutionStatus(c).ready);
});

test('neglect produces a shadow apex form', () => {
  seed(4);
  const c = raise('sproutle', { train: 'guard', discipline: true, style: 'tactical' });
  // Force a stage-2 creature to be neglected before its final evolution.
  const d = CF.createCreature('sproutle');
  Object.assign(d, JSON.parse(JSON.stringify(c)), { stage: 2, formId: CF.formId(2, 'guard', 'disciplined', 'tactical'), bond: 20 });
  d.age = CF.EVOLUTION_GATES[3].age;
  CF.evolve(d);
  assert.strictEqual(CF.FORMS[d.formId].bond, 'shadow');
  assert.strictEqual(CF.FORMS[c.formId].bond, 'radiant');
});

test('battles always terminate and record move styles', () => {
  seed(5);
  for (let i = 0; i < 50; i++) {
    const c = CF.createCreature();
    c.stage = 1;
    const b = CF.startBattle(c, ['rookie', 'rival', 'champion'][i % 3]).battle;
    let turns = 0;
    while (!b.over && turns < 200) { b.choose(Object.keys(CF.MOVES)[turns % 5]); turns++; }
    assert.ok(b.over, 'battle should end');
    CF.applyBattleResult(c, b);
    assert.strictEqual(c.battles.aggressive + c.battles.tactical, turns);
  }
});
