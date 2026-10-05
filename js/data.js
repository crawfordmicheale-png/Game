/*
 * Static game data: traits, elements, hatchlings and the full evolution web.
 *
 * Evolution is NOT a fixed family tree. Every form is addressed by the
 * raising decisions that produce it:
 *
 *   Stage 0 (6)  hatchling          random at hatch
 *   Stage 1 (12) trait x temperament                    -> how you raised it
 *   Stage 2 (24) trait x temperament x battle style     -> + how you fight
 *   Stage 3 (48) trait x temperament x style x bond     -> + how well you cared
 *
 * Because the hatchling type only nudges a creature (a small starting trait
 * bias and its element), two identical hatchlings can end up as completely
 * different forms, and two different hatchlings can converge on the same one.
 */
(function (g) {
  const CF = (g.CF = g.CF || {});

  CF.TRAITS = ['might', 'swift', 'wit', 'heart', 'guard', 'fury'];

  // e.g. formId(2, 'wit', 'wild', 'tactical') -> 's2-wit-wild-tactical'
  CF.formId = function (stage, ...branches) {
    return ['s' + stage, ...branches].join('-');
  };

  CF.TRAIT_INFO = {
    might: { label: 'Might', icon: '💪', color: '#e0703a', train: 'Lift Boulders', desc: 'Raw strength built by heavy training.' },
    swift: { label: 'Swift', icon: '💨', color: '#48c2d8', train: 'Sprint Laps', desc: 'Speed and reflexes from running drills.' },
    wit: { label: 'Wit', icon: '🧠', color: '#9b7be8', train: 'Solve Puzzles', desc: 'Cunning grown through puzzles and study.' },
    heart: { label: 'Heart', icon: '💗', color: '#ee6fa0', train: 'Play Together', desc: 'Affection earned through play and attention.' },
    guard: { label: 'Guard', icon: '🛡️', color: '#6fae5c', train: 'Endurance Drills', desc: 'Toughness from endurance work.' },
    fury: { label: 'Fury', icon: '🔥', color: '#d8404a', train: 'Rough Sparring', desc: 'Aggression stoked by rough sparring.' },
  };

  CF.TEMPERAMENTS = {
    disciplined: { label: 'Disciplined', desc: 'Raised with structure: scolded when it misbehaved, fed proper meals.' },
    wild: { label: 'Wild', desc: 'Raised loose: spoiled with treats, misbehaviour let slide.' },
  };

  CF.STYLES = {
    aggressive: { label: 'Aggressive', desc: 'Fights by hitting hard and often.' },
    tactical: { label: 'Tactical', desc: 'Fights by guarding, focusing and feinting.' },
  };

  CF.BONDS = {
    radiant: { label: 'Radiant', desc: 'Well cared for: fed, clean, rested and loved.' },
    shadow: { label: 'Shadow', desc: 'Neglected or pushed too hard. Its heart has darkened.' },
  };

  CF.ELEMENTS = {
    fire: { label: 'Fire', icon: '🔥', body: '#f0864a', dark: '#b8452a', light: '#ffd29a' },
    water: { label: 'Water', icon: '💧', body: '#4aa3e8', dark: '#2a5fa8', light: '#b8e4ff' },
    nature: { label: 'Nature', icon: '🌿', body: '#6cc46a', dark: '#357a3c', light: '#d2f5b0' },
    wind: { label: 'Wind', icon: '🌀', body: '#9fe0d4', dark: '#4a9a9a', light: '#f0fffa' },
    earth: { label: 'Earth', icon: '🪨', body: '#b48a5e', dark: '#6e4e30', light: '#ead2a8' },
    storm: { label: 'Storm', icon: '⚡', body: '#f2d24a', dark: '#8a6ad0', light: '#fff6b8' },
  };

  // Each element is strong against the next one in the wheel.
  CF.ELEMENT_BEATS = {
    water: 'fire', // douses
    fire: 'nature', // burns
    nature: 'earth', // roots crack stone
    earth: 'storm', // grounds lightning
    storm: 'wind', // overpowers
    wind: 'water', // scatters
  };

  CF.HATCHLINGS = [
    { id: 'emberling', name: 'Emberling', element: 'fire', bias: 'fury', desc: 'A hot-headed spark of a creature. Leans toward Fury.' },
    { id: 'tidepup', name: 'Tidepup', element: 'water', bias: 'heart', desc: 'A gentle, clingy pup of the shallows. Leans toward Heart.' },
    { id: 'sproutle', name: 'Sproutle', element: 'nature', bias: 'guard', desc: 'A sturdy little sprout. Leans toward Guard.' },
    { id: 'zephlet', name: 'Zephlet', element: 'wind', bias: 'swift', desc: 'A restless puff of breeze. Leans toward Swift.' },
    { id: 'pebblit', name: 'Pebblit', element: 'earth', bias: 'might', desc: 'A dense, stubborn pebble. Leans toward Might.' },
    { id: 'sparkit', name: 'Sparkit', element: 'storm', bias: 'wit', desc: 'A crackling, curious critter. Leans toward Wit.' },
  ];

  // Name table for the evolution web.
  // LINES[trait][temperament] = { name, aggressive: {name, radiant, shadow}, tactical: {...} }
  const LINES = {
    might: {
      disciplined: {
        name: 'Bulwhelp',
        aggressive: { name: 'Ironhorn', radiant: 'Titanhorn', shadow: 'Dreadhorn' },
        tactical: { name: 'Bastionox', radiant: 'Aegisaur', shadow: 'Gravemont' },
      },
      wild: {
        name: 'Brawlub',
        aggressive: { name: 'Ragebuck', radiant: 'Sunbreaker', shadow: 'Ruinbull' },
        tactical: { name: 'Grapplor', radiant: 'Wrestalion', shadow: 'Strangulor' },
      },
    },
    swift: {
      disciplined: {
        name: 'Flitwing',
        aggressive: { name: 'Lancewing', radiant: 'Skylance', shadow: 'Nightlance' },
        tactical: { name: 'Mirageon', radiant: 'Prismirage', shadow: 'Phantomire' },
      },
      wild: {
        name: 'Scamprel',
        aggressive: { name: 'Rippertail', radiant: 'Galeripper', shadow: 'Shredwraith' },
        tactical: { name: 'Tricksift', radiant: 'Foxfable', shadow: 'Hexvixen' },
      },
    },
    wit: {
      disciplined: {
        name: 'Ponderoo',
        aggressive: { name: 'Arcanox', radiant: 'Solarcanus', shadow: 'Nullarcanus' },
        tactical: { name: 'Stratagor', radiant: 'Grandmind', shadow: 'Schemelord' },
      },
      wild: {
        name: 'Glintrick',
        aggressive: { name: 'Hexbolt', radiant: 'Starhex', shadow: 'Cursebolt' },
        tactical: { name: 'Puzzlurk', radiant: 'Riddlewyrm', shadow: 'Enigmaw' },
      },
    },
    heart: {
      disciplined: {
        name: 'Cuddlume',
        aggressive: { name: 'Valorpaw', radiant: 'Paladrake', shadow: 'Grudgepaw' },
        tactical: { name: 'Mendlight', radiant: 'Seraphawn', shadow: 'Hollowmend' },
      },
      wild: {
        name: 'Clingle',
        aggressive: { name: 'Feralove', radiant: 'Bloomrage', shadow: 'Heartrot' },
        tactical: { name: 'Lullabat', radiant: 'Dreamwisp', shadow: 'Somnivore' },
      },
    },
    guard: {
      disciplined: {
        name: 'Shellmet',
        aggressive: { name: 'Spikard', radiant: 'Crystaspike', shadow: 'Obsidispike' },
        tactical: { name: 'Fortudo', radiant: 'Citadelon', shadow: 'Cryptudo' },
      },
      wild: {
        name: 'Burrowl',
        aggressive: { name: 'Thornback', radiant: 'Briarking', shadow: 'Blightback' },
        tactical: { name: 'Delvermole', radiant: 'Gemdelver', shadow: 'Abyssdelver' },
      },
    },
    fury: {
      disciplined: {
        name: 'Snarlet',
        aggressive: { name: 'Warfang', radiant: 'Sunfang', shadow: 'Doomfang' },
        tactical: { name: 'Duelisk', radiant: 'Honorblade', shadow: 'Executhorn' },
      },
      wild: {
        name: 'Ravagup',
        aggressive: { name: 'Berserkat', radiant: 'Blazemane', shadow: 'Carnagecat' },
        tactical: { name: 'Stalkurr', radiant: 'Moonstalker', shadow: 'Shadestalker' },
      },
    },
  };

  const TRAIT_NOUN = {
    might: 'powerhouse',
    swift: 'blur of motion',
    wit: 'schemer',
    heart: 'devoted companion',
    guard: 'living fortress',
    fury: 'born brawler',
  };
  const TEMPER_ADJ = { disciplined: 'well-mannered', wild: 'unruly' };
  const STYLE_PHRASE = {
    aggressive: 'that overwhelms foes with relentless attacks',
    tactical: 'that outthinks foes with guards and feints',
  };
  const BOND_PHRASE = {
    radiant: 'Years of loving care make it shine with an inner light.',
    shadow: 'Neglect and hardship have wrapped it in a dark aura.',
  };

  CF.FORMS = {};

  function addForm(f) {
    CF.FORMS[f.id] = f;
  }

  CF.HATCHLINGS.forEach((h) =>
    addForm({
      id: 'h-' + h.id,
      name: h.name,
      stage: 0,
      trait: h.bias,
      temperament: null,
      style: null,
      bond: null,
      hatchling: h.id,
      element: h.element,
      desc: h.desc,
    })
  );

  CF.TRAITS.forEach((trait) => {
    ['disciplined', 'wild'].forEach((temp) => {
      const s1 = LINES[trait][temp];
      addForm({
        id: CF.formId(1, trait, temp),
        name: s1.name,
        stage: 1,
        trait,
        temperament: temp,
        style: null,
        bond: null,
        desc: `A ${TEMPER_ADJ[temp]} young ${TRAIT_NOUN[trait]}.`,
      });
      ['aggressive', 'tactical'].forEach((style) => {
        const s2 = s1[style];
        addForm({
          id: CF.formId(2, trait, temp, style),
          name: s2.name,
          stage: 2,
          trait,
          temperament: temp,
          style,
          bond: null,
          desc: `A ${TEMPER_ADJ[temp]} ${TRAIT_NOUN[trait]} ${STYLE_PHRASE[style]}.`,
        });
        ['radiant', 'shadow'].forEach((bond) => {
          addForm({
            id: CF.formId(3, trait, temp, style, bond),
            name: s2[bond],
            stage: 3,
            trait,
            temperament: temp,
            style,
            bond,
            desc: `A ${TEMPER_ADJ[temp]} ${TRAIT_NOUN[trait]} ${STYLE_PHRASE[style]}. ${BOND_PHRASE[bond]}`,
          });
        });
      });
    });
  });

  CF.formsAtStage = function (stage) {
    return Object.values(CF.FORMS).filter((f) => f.stage === stage);
  };

  CF.STAGE_NAMES = ['Hatchling', 'Juvenile', 'Adult', 'Apex'];
})(typeof window !== 'undefined' ? window : globalThis);
