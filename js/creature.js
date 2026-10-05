/*
 * Creature model: care actions, the daily tick and evolution rules.
 * Pure logic, no DOM, so it can be unit tested in Node.
 */
(function (g) {
  const CF = (g.CF = g.CF || {});

  CF.rand = Math.random;
  CF.AP_PER_DAY = 4;

  // Requirements to reach each stage (age in days, total battles fought).
  CF.EVOLUTION_GATES = {
    1: { age: 4, battles: 0 },
    2: { age: 10, battles: 3 },
    3: { age: 18, battles: 8 },
  };

  // Weighting used when deciding a creature's leanings at evolution time:
  // lifetime totals count half, growth since the last evolution counts fully,
  // so a creature can be steered onto a new path mid-life.
  const LIFETIME_WEIGHT = 0.5;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (arr) => arr[Math.floor(CF.rand() * arr.length)];
  CF.clamp = clamp;
  CF.pick = pick;

  let nextId = 1;
  function uid() {
    return 'c' + Date.now().toString(36) + (nextId++).toString(36) + Math.floor(CF.rand() * 1e6).toString(36);
  }

  CF.createCreature = function (hatchlingId, nickname) {
    const h = hatchlingId ? CF.HATCHLINGS.find((x) => x.id === hatchlingId) : pick(CF.HATCHLINGS);
    const traits = {};
    CF.TRAITS.forEach((t) => (traits[t] = 0));
    traits[h.bias] = 5;
    const c = {
      id: uid(),
      nickname: nickname || h.name,
      hatchling: h.id,
      bias: h.bias,
      element: h.element,
      stage: 0,
      formId: 'h-' + h.id,
      age: 0,
      ap: CF.AP_PER_DAY,
      needs: { fullness: 70, energy: 80, mood: 70, hygiene: 80 },
      traits,
      discipline: 0, // -100 (wild) .. 100 (disciplined)
      bond: 50, // 0 (shadow) .. 100 (radiant)
      sick: false,
      event: null, // pending misbehaviour
      battles: { wins: 0, losses: 0, aggressive: 0, tactical: 0 },
      snap: null,
      history: [],
      log: [],
    };
    takeSnapshot(c);
    c.history.push({ stage: 0, formId: c.formId, day: 0, reasons: ['Hatched from a random egg.'] });
    return c;
  };

  function takeSnapshot(c) {
    c.snap = { traits: { ...c.traits }, aggressive: c.battles.aggressive, tactical: c.battles.tactical };
  }

  function log(c, msg) {
    c.log.unshift({ day: c.age, msg });
    if (c.log.length > 40) c.log.length = 40;
    return msg;
  }
  CF.log = log;

  function addTrait(c, t, amount) {
    c.traits[t] = Math.round((c.traits[t] + amount) * 10) / 10;
  }
  CF.addTrait = addTrait;

  function adjust(c, key, delta) {
    if (key in c.needs) c.needs[key] = clamp(c.needs[key] + delta, 0, 100);
    else if (key === 'bond') c.bond = clamp(c.bond + delta, 0, 100);
    else if (key === 'discipline') c.discipline = clamp(c.discipline + delta, -100, 100);
  }
  CF.adjust = adjust;

  // ---------------------------------------------------------------- actions

  const TRAIN_SIDE_EFFECTS = {
    fury: { discipline: -1 }, // rough-housing makes it unruly
    guard: { discipline: 1 }, // endurance work builds patience
  };

  CF.ACTIONS = [
    { id: 'meal', label: 'Meal', icon: '🍖', kind: 'care', desc: 'Fullness +40. Proper meals at the right time build discipline.' },
    { id: 'treat', label: 'Treat', icon: '🍬', kind: 'care', desc: 'Mood +20, but spoiling it lowers discipline.' },
    { id: 'clean', label: 'Bathe', icon: '🫧', kind: 'care', desc: 'Restores hygiene. A little bonding time.' },
    { id: 'rest', label: 'Nap', icon: '💤', kind: 'care', desc: 'Energy +40.' },
    { id: 'medicine', label: 'Medicine', icon: '💊', kind: 'care', desc: 'Cures sickness.' },
    ...['might', 'swift', 'wit', 'heart', 'guard', 'fury'].map((t) => ({
      id: 'train-' + t,
      trait: t,
      label: CF.TRAIT_INFO[t].train,
      icon: CF.TRAIT_INFO[t].icon,
      kind: 'train',
      desc:
        t === 'heart'
          ? 'Heart up, mood and bond up. Costs a little energy.'
          : `${CF.TRAIT_INFO[t].label} up. Tiring and messy.` +
            (t === 'fury' ? ' Makes it unruly.' : t === 'guard' ? ' Builds patience.' : ''),
    })),
  ];

  CF.canDo = function (c, actionId) {
    if (c.ap <= 0) return { ok: false, why: 'No actions left today. End the day.' };
    if (actionId === 'medicine' && !c.sick) return { ok: false, why: 'Not sick.' };
    if (actionId.startsWith('train-') && c.sick && actionId !== 'train-heart') return { ok: false, why: 'Too sick to train.' };
    return { ok: true };
  };

  CF.perform = function (c, actionId) {
    const can = CF.canDo(c, actionId);
    if (!can.ok) return { ok: false, msg: can.why };
    c.ap--;
    const n = c.needs;
    const name = c.nickname;
    let msg;

    if (actionId === 'meal') {
      if (n.fullness >= 85) {
        adjust(c, 'fullness', 10);
        adjust(c, 'mood', -5);
        msg = `${name} wasn't hungry and just picked at the meal.`;
      } else {
        adjust(c, 'fullness', 40);
        adjust(c, 'discipline', 1);
        msg = `${name} ate a hearty meal.`;
      }
    } else if (actionId === 'treat') {
      adjust(c, 'mood', 20);
      adjust(c, 'fullness', 8);
      adjust(c, 'discipline', -2);
      addTrait(c, 'heart', 0.5);
      msg = `${name} gobbled the treat happily. A little spoiled...`;
    } else if (actionId === 'clean') {
      n.hygiene = 100;
      adjust(c, 'mood', 5);
      adjust(c, 'bond', 1);
      msg = `${name} is squeaky clean.`;
    } else if (actionId === 'rest') {
      adjust(c, 'energy', 40);
      adjust(c, 'mood', 5);
      msg = `${name} took a long nap.`;
    } else if (actionId === 'medicine') {
      c.sick = false;
      adjust(c, 'mood', -5);
      msg = `${name} grimaced at the medicine but feels better.`;
    } else if (actionId === 'train-heart') {
      const gain = n.mood >= 60 ? 4 : 3;
      addTrait(c, 'heart', gain);
      adjust(c, 'mood', 15);
      adjust(c, 'energy', -10);
      adjust(c, 'hygiene', -5);
      adjust(c, 'bond', 2);
      msg = `You played with ${name}. Heart +${gain}.`;
    } else if (actionId.startsWith('train-')) {
      const t = actionId.slice(6);
      let gain;
      if (n.energy < 20) {
        gain = 1;
        adjust(c, 'bond', -4);
        adjust(c, 'mood', -10);
        msg = `${name} was exhausted but you pushed it anyway. ${CF.TRAIT_INFO[t].label} +${gain}. It resents you a little.`;
      } else {
        gain = n.mood >= 60 ? 4 : 3;
        msg = `${name} trained hard. ${CF.TRAIT_INFO[t].label} +${gain}.`;
      }
      addTrait(c, t, gain);
      adjust(c, 'energy', -25);
      adjust(c, 'fullness', -10);
      adjust(c, 'hygiene', -10);
      adjust(c, 'mood', -5);
      const side = TRAIN_SIDE_EFFECTS[t];
      if (side) Object.entries(side).forEach(([k, v]) => adjust(c, k, v));
    } else {
      c.ap++;
      return { ok: false, msg: 'Unknown action.' };
    }
    log(c, msg);
    return { ok: true, msg };
  };

  // ------------------------------------------------------------ misbehaviour

  CF.MISBEHAVIOURS = [
    'is refusing to eat its vegetables.',
    'chewed up your boots.',
    'is throwing a tantrum for treats.',
    "bit another creature's tail.",
    'knocked the water bowl over on purpose.',
    'is hiding and ignoring you when called.',
    'dug up the garden.',
  ];

  CF.resolveEvent = function (c, choice) {
    if (!c.event) return null;
    let msg;
    if (choice === 'scold') {
      adjust(c, 'discipline', 4);
      adjust(c, 'mood', -6);
      msg = `You scolded ${c.nickname}. It sulks, but it's learning. (Discipline up)`;
    } else {
      adjust(c, 'discipline', -4);
      adjust(c, 'mood', 8);
      adjust(c, 'bond', 1);
      msg = `You let it slide. ${c.nickname} is delighted. (Discipline down)`;
    }
    c.event = null;
    return log(c, msg);
  };

  // ---------------------------------------------------------------- the day

  CF.endDay = function (c) {
    const msgs = [];
    const n = c.needs;
    const say = (m) => msgs.push(log(c, m));

    if (c.event) {
      adjust(c, 'discipline', -3);
      say(`You ignored ${c.nickname}'s misbehaviour. It learned it can get away with it.`);
      c.event = null;
    }

    // Bond: judged on how the creature goes to bed tonight.
    let bond = 0;
    if (n.fullness < 20) {
      bond -= 4;
      say(`${c.nickname} went to bed hungry.`);
    }
    if (n.hygiene < 25) {
      bond -= 2;
      say(`${c.nickname} is filthy.`);
    }
    if (n.energy < 15) {
      bond -= 3;
      say(`${c.nickname} collapsed from exhaustion.`);
    }
    if (n.mood >= 70) bond += 2;
    else if (n.mood < 30) bond -= 2;
    if (n.fullness >= 50 && n.hygiene >= 50 && n.energy >= 40 && n.mood >= 50) {
      bond += 2;
      say(`${c.nickname} curled up content.`);
    }
    if (c.sick) {
      bond -= 3;
      adjust(c, 'mood', -10);
      say(`${c.nickname} is still sick.`);
    }
    adjust(c, 'bond', bond);

    // Overnight changes.
    adjust(c, 'fullness', -25);
    adjust(c, 'hygiene', -15);
    adjust(c, 'mood', -5 - (n.fullness < 20 ? 10 : 0) - (n.hygiene < 25 ? 5 : 0));
    adjust(c, 'energy', 35);

    if (!c.sick && (n.fullness <= 10 || n.hygiene <= 15) && CF.rand() < 0.5) {
      c.sick = true;
      say(`${c.nickname} has fallen sick!`);
    }

    c.age++;
    c.ap = CF.AP_PER_DAY;

    let evolution = null;
    if (CF.evolutionStatus(c).ready) evolution = CF.evolve(c);

    const eventChance = 0.3 + (c.discipline < 0 ? 0.15 : 0);
    if (CF.rand() < eventChance) {
      c.event = pick(CF.MISBEHAVIOURS);
    }

    return { msgs, evolution };
  };

  // -------------------------------------------------------------- evolution

  CF.traitScores = function (c) {
    const s = {};
    CF.TRAITS.forEach((t) => {
      s[t] = c.traits[t] * LIFETIME_WEIGHT + (c.traits[t] - c.snap.traits[t]);
    });
    return s;
  };

  CF.dominantTrait = function (c) {
    const scores = CF.traitScores(c);
    // Ties favour the hatchling's natural bias, then the canonical order.
    const order = [c.bias, ...CF.TRAITS.filter((t) => t !== c.bias)];
    let best = order[0];
    order.forEach((t) => {
      if (scores[t] > scores[best]) best = t;
    });
    return best;
  };

  CF.temperamentOf = function (c) {
    return c.discipline >= 0 ? 'disciplined' : 'wild';
  };

  CF.styleScores = function (c) {
    const b = c.battles;
    return {
      aggressive: b.aggressive * LIFETIME_WEIGHT + (b.aggressive - c.snap.aggressive),
      tactical: b.tactical * LIFETIME_WEIGHT + (b.tactical - c.snap.tactical),
    };
  };

  CF.styleOf = function (c) {
    const s = CF.styleScores(c);
    return s.aggressive >= s.tactical ? 'aggressive' : 'tactical';
  };

  CF.bondOf = function (c) {
    return c.bond >= 50 ? 'radiant' : 'shadow';
  };

  CF.leanings = function (c) {
    return {
      trait: CF.dominantTrait(c),
      temperament: CF.temperamentOf(c),
      style: CF.styleOf(c),
      bond: CF.bondOf(c),
    };
  };

  // The form this creature would become if it evolved right now.
  CF.forecastFormId = function (c) {
    const next = c.stage + 1;
    if (next > 3) return null;
    const l = CF.leanings(c);
    const branches = [l.trait, l.temperament, l.style, l.bond].slice(0, next + 1);
    return CF.formId(next, ...branches);
  };

  CF.totalBattles = function (c) {
    return c.battles.wins + c.battles.losses;
  };

  CF.evolutionStatus = function (c) {
    const next = c.stage + 1;
    const gate = CF.EVOLUTION_GATES[next];
    if (!gate) return { ready: false, final: true, reqs: [] };
    const reqs = [{ label: `Age ${gate.age} days`, have: c.age, need: gate.age, met: c.age >= gate.age }];
    if (gate.battles > 0) {
      const b = CF.totalBattles(c);
      reqs.push({ label: `${gate.battles} battles fought`, have: b, need: gate.battles, met: b >= gate.battles });
    }
    return { ready: reqs.every((r) => r.met), final: false, stage: next, reqs };
  };

  CF.evolve = function (c) {
    const from = c.formId;
    const to = CF.forecastFormId(c);
    const l = CF.leanings(c);
    const next = c.stage + 1;
    const reasons = [
      `Its training focused on ${CF.TRAIT_INFO[l.trait].label}.`,
      `You raised it ${l.temperament === 'disciplined' ? 'with firm discipline' : 'loose and spoiled'}.`,
    ];
    if (next >= 2) reasons.push(`It fights ${l.style === 'aggressive' ? 'aggressively' : 'tactically'} in battle.`);
    if (next >= 3) reasons.push(l.bond === 'radiant' ? 'It feels deeply loved and cared for.' : 'It has known neglect and hardship.');

    c.stage = next;
    c.formId = to;
    if (c.nickname === CF.FORMS[from].name) c.nickname = CF.FORMS[to].name;
    c.history.push({ stage: next, formId: to, day: c.age, reasons });
    takeSnapshot(c);
    log(c, `Evolved into ${CF.FORMS[to].name}!`);
    return { from, to, reasons };
  };

  // Forms only ever change by evolving, so the codex is derived from history.
  CF.formsSeenBy = function (c) {
    return c.history.map((h) => h.formId);
  };
})(typeof window !== 'undefined' ? window : globalThis);
