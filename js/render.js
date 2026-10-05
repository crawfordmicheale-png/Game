/*
 * Procedural SVG creature art. Each evolution branch maps to a visible
 * feature so you can read a creature's upbringing from its look:
 *
 *   trait        -> body shape
 *   element      -> colours + emblem (inherited from the hatchling)
 *   temperament  -> eyes (calm & round vs. sharp & fanged)
 *   style        -> horns & claws (aggressive) or armour plates (tactical)
 *   bond         -> golden halo (radiant) or dark wisps (shadow)
 *   stage        -> size and extra flourishes
 */
(function (g) {
  const CF = (g.CF = g.CF || {});

  function hex(c) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hex(a);
    const B = hex(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  let gradId = 0;

  // Body outline per dominant trait, centred on (0,0), roughly 120 wide.
  const BODIES = {
    might: 'M-58,10 C-62,-40 -40,-58 0,-58 C40,-58 62,-40 58,10 C56,48 34,58 0,58 C-34,58 -56,48 -58,10 Z',
    swift: 'M-36,20 C-46,-20 -24,-56 4,-58 C34,-58 46,-26 40,8 C34,40 18,56 -4,56 C-24,56 -32,44 -36,20 Z',
    wit: 'M-52,-6 C-52,-46 -26,-64 0,-64 C26,-64 52,-46 52,-6 C52,30 30,52 0,52 C-30,52 -52,30 -52,-6 Z',
    heart: 'M-50,8 C-50,-34 -28,-52 0,-52 C28,-52 50,-34 50,8 C50,42 28,58 0,58 C-28,58 -50,42 -50,8 Z',
    guard: 'M-54,24 C-54,-4 -36,-36 0,-36 C36,-36 54,-4 54,24 C54,46 30,56 0,56 C-30,56 -54,46 -54,24 Z',
    fury: 'M-46,48 L-56,0 L-38,-44 L-8,-58 L24,-52 L50,-24 L54,18 L40,52 L0,58 Z',
  };

  // Where the face sits for each body.
  const FACE_Y = { might: -18, swift: -24, wit: -26, heart: -12, guard: -4, fury: -20 };

  function emblem(element, x, y, s, color) {
    const t = `translate(${x},${y}) scale(${s})`;
    switch (element) {
      case 'fire':
        return `<path transform="${t}" d="M0,-16 C8,-6 10,2 6,8 C4,12 -4,12 -6,8 C-10,2 -6,-4 -2,-6 C-2,-2 0,0 2,-2 C4,-6 2,-12 0,-16 Z" fill="${color}"/>`;
      case 'water':
        return `<path transform="${t}" d="M0,-14 C6,-4 10,2 10,6 C10,12 5,16 0,16 C-5,16 -10,12 -10,6 C-10,2 -6,-4 0,-14 Z" fill="${color}"/>`;
      case 'nature':
        return `<path transform="${t}" d="M-10,10 C-12,-6 0,-14 12,-14 C12,0 4,12 -10,10 Z M-10,10 L4,-4" fill="${color}" stroke="${color}" stroke-width="1.5"/>`;
      case 'wind':
        return `<path transform="${t}" d="M-12,0 C-12,-10 8,-12 8,-2 C8,4 0,6 -2,0 M-12,6 L10,6" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
      case 'earth':
        return `<path transform="${t}" d="M-10,6 L-6,-8 L6,-10 L12,2 L4,10 Z" fill="${color}"/>`;
      case 'storm':
        return `<path transform="${t}" d="M2,-16 L-8,2 L0,2 L-4,16 L8,-4 L0,-4 Z" fill="${color}"/>`;
      default:
        return '';
    }
  }

  function eyes(temperament, y, bond, stage, trait) {
    const spread = trait === 'swift' ? 14 : 18;
    const pupil = bond === 'shadow' ? '#d0203a' : '#1c1830';
    if (temperament === 'wild') {
      const e = (x, dir) =>
        `<path d="M${x - 9},${y - 2 * dir} L${x + 9},${y + 2 * dir} L${x + 6},${y + 6} L${x - 6},${y + 6} Z" fill="#fff" stroke="#1c1830" stroke-width="2" stroke-linejoin="round"/>` +
        `<circle cx="${x}" cy="${y + 3}" r="3.5" fill="${pupil}"/>`;
      return e(-spread, 1) + e(spread, -1) + (stage >= 1 ? '' : '');
    }
    const r = stage === 0 ? 8 : 7;
    const e = (x) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#1c1830" stroke-width="2"/>` +
      `<circle cx="${x + 1}" cy="${y + 1}" r="${r * 0.55}" fill="${pupil}"/>` +
      `<circle cx="${x - 2}" cy="${y - 2}" r="${r * 0.25}" fill="#fff"/>`;
    return e(-spread) + e(spread);
  }

  function mouth(temperament, y) {
    if (temperament === 'wild') {
      return (
        `<path d="M-10,${y} Q0,${y + 8} 10,${y}" fill="none" stroke="#1c1830" stroke-width="2.5" stroke-linecap="round"/>` +
        `<path d="M-6,${y + 2} L-4,${y + 8} L-2,${y + 3} Z M6,${y + 2} L4,${y + 8} L2,${y + 3} Z" fill="#fff" stroke="#1c1830" stroke-width="1"/>`
      );
    }
    return `<path d="M-7,${y} Q0,${y + 6} 7,${y}" fill="none" stroke="#1c1830" stroke-width="2.5" stroke-linecap="round"/>`;
  }

  // Features that sit behind the body.
  function backFeatures(f, col) {
    const { trait, stage } = f;
    let s = '';
    if (stage >= 1 && trait === 'swift') {
      const span = 30 + stage * 14;
      s += `<path d="M-30,-10 C-${50 + span},-${40 + span / 2} -${40 + span},10 -30,14 Z" fill="${col.light}" stroke="${col.dark}" stroke-width="2.5" opacity="0.95"/>`;
      s += `<path d="M30,-10 C${50 + span},-${40 + span / 2} ${40 + span},10 30,14 Z" fill="${col.light}" stroke="${col.dark}" stroke-width="2.5" opacity="0.95"/>`;
    }
    if (stage >= 1 && trait === 'fury') {
      for (let i = 0; i < 2 + stage; i++) {
        const x = -30 + i * (60 / (1 + stage));
        s += `<path d="M${x - 8},-40 L${x},-${70 + stage * 6} L${x + 8},-40 Z" fill="${col.dark}"/>`;
      }
    }
    if (stage >= 2) {
      // Tail.
      const tip = trait === 'fury' ? `<path d="M76,24 L92,14 L84,34 Z" fill="${col.dark}"/>` : `<circle cx="80" cy="22" r="8" fill="${col.light}" stroke="${col.dark}" stroke-width="2"/>`;
      s += `<path d="M40,36 C62,46 72,40 78,24" fill="none" stroke="${col.dark}" stroke-width="10" stroke-linecap="round"/>` + tip;
    }
    if (stage >= 1 && trait === 'heart') {
      s += `<ellipse cx="-40" cy="-40" rx="12" ry="${22 + stage * 4}" transform="rotate(-30 -40 -40)" fill="${col.body}" stroke="${col.dark}" stroke-width="2.5"/>`;
      s += `<ellipse cx="40" cy="-40" rx="12" ry="${22 + stage * 4}" transform="rotate(30 40 -40)" fill="${col.body}" stroke="${col.dark}" stroke-width="2.5"/>`;
    }
    return s;
  }

  // Features that sit on top of the body.
  function frontFeatures(f, col) {
    const { trait, stage, style } = f;
    const fy = FACE_Y[trait];
    let s = '';

    if (trait === 'guard' && stage >= 1) {
      // Shell dome with plates.
      s += `<path d="M-56,10 C-56,-50 56,-50 56,10 C40,0 -40,0 -56,10 Z" fill="${col.dark}" stroke="#1c1830" stroke-width="2"/>`;
      for (let i = -2; i <= 2; i++) s += `<path d="M${i * 18},-28 L${i * 18 + 8},-14 L${i * 18 - 8},-14 Z" fill="${col.light}" opacity="0.6"/>`;
    }
    if (trait === 'wit' && stage >= 1) {
      s += `<path d="M0,-62 Q-4,-80 4,-90" fill="none" stroke="${col.dark}" stroke-width="3"/><circle cx="4" cy="-92" r="7" fill="${col.light}" stroke="${col.dark}" stroke-width="2"/>`;
      if (stage >= 2) s += `<ellipse cx="0" cy="${fy - 22}" rx="6" ry="8" fill="#fff" stroke="#1c1830" stroke-width="2"/><circle cx="0" cy="${fy - 21}" r="3" fill="#7a4ad8"/>`;
    }
    if (trait === 'heart') {
      s += `<path d="M0,40 C-4,34 -14,30 -14,22 C-14,16 -6,14 0,20 C6,14 14,16 14,22 C14,30 4,34 0,40 Z" fill="#ff7aa8" stroke="${col.dark}" stroke-width="1.5"/>`;
    }
    if (trait === 'might' && stage >= 1) {
      // Big arms.
      s += `<ellipse cx="-60" cy="20" rx="14" ry="22" fill="${col.body}" stroke="${col.dark}" stroke-width="2.5"/>`;
      s += `<ellipse cx="60" cy="20" rx="14" ry="22" fill="${col.body}" stroke="${col.dark}" stroke-width="2.5"/>`;
    }

    // Belly patch.
    if (trait !== 'heart') s += `<ellipse cx="0" cy="30" rx="${trait === 'swift' ? 18 : 26}" ry="18" fill="${col.light}" opacity="0.55"/>`;

    // Battle style.
    if (style === 'aggressive') {
      const h = 18 + stage * 6;
      s += `<path d="M-26,${fy - 26} Q-40,${fy - 30 - h} -24,${fy - 40 - h}" fill="none" stroke="#f5ecd8" stroke-width="7" stroke-linecap="round"/>`;
      s += `<path d="M26,${fy - 26} Q40,${fy - 30 - h} 24,${fy - 40 - h}" fill="none" stroke="#f5ecd8" stroke-width="7" stroke-linecap="round"/>`;
      // Claws.
      [-30, 30].forEach((x) => {
        for (let i = -1; i <= 1; i++) s += `<path d="M${x + i * 5 - 2},56 L${x + i * 5},66 L${x + i * 5 + 2},56 Z" fill="#f5ecd8" stroke="#1c1830" stroke-width="1"/>`;
      });
    } else if (style === 'tactical') {
      s += `<path d="M-30,${fy - 18} L30,${fy - 18} L24,${fy - 30} L-24,${fy - 30} Z" fill="#c9d3e0" stroke="#1c1830" stroke-width="2"/>`;
      s += `<path d="M-20,18 L20,18 L16,44 L0,52 L-16,44 Z" fill="#c9d3e0" stroke="#1c1830" stroke-width="2" opacity="0.9"/>`;
      s += `<path d="M0,22 L0,46" stroke="${col.dark}" stroke-width="3"/>`;
    }

    // Element emblem on the forehead.
    s += emblem(f.element, 0, fy - 14, stage === 0 ? 0.6 : 0.7, col.dark);

    s += eyes(f.temperament, fy, f.bond, stage, trait);
    s += mouth(f.temperament, fy + 14);

    if (stage >= 3) {
      // Crown markings.
      s += `<path d="M-16,${fy - 40} L-8,${fy - 52} L0,${fy - 40} L8,${fy - 52} L16,${fy - 40}" fill="none" stroke="${f.bond === 'radiant' ? '#ffd84a' : '#9a5ad8'}" stroke-width="4" stroke-linejoin="round"/>`;
    }
    return s;
  }

  function aura(bond, id) {
    if (bond === 'radiant') {
      return (
        `<defs><radialGradient id="aura${id}"><stop offset="0%" stop-color="#fff6c0" stop-opacity="0.9"/><stop offset="100%" stop-color="#ffd84a" stop-opacity="0"/></radialGradient></defs>` +
        `<circle cx="100" cy="104" r="96" fill="url(#aura${id})"/>` +
        `<ellipse cx="100" cy="22" rx="30" ry="7" fill="none" stroke="#ffd84a" stroke-width="4"/>`
      );
    }
    if (bond === 'shadow') {
      let s = `<defs><radialGradient id="aura${id}"><stop offset="0%" stop-color="#3a1a5a" stop-opacity="0.8"/><stop offset="100%" stop-color="#1a0a2a" stop-opacity="0"/></radialGradient></defs>`;
      s += `<circle cx="100" cy="104" r="96" fill="url(#aura${id})"/>`;
      for (let i = 0; i < 5; i++) {
        const x = 30 + i * 35;
        s += `<path d="M${x},180 C${x - 14},140 ${x + 14},120 ${x},${90 - (i % 2) * 20}" fill="none" stroke="#6a3a9a" stroke-width="4" stroke-linecap="round" opacity="0.6"/>`;
      }
      return s;
    }
    return '';
  }

  // spec: { stage, trait, temperament, style, bond, element }
  CF.creatureSVG = function (spec, opts = {}) {
    const id = ++gradId;
    const base = CF.ELEMENTS[spec.element] || CF.ELEMENTS.fire;
    let col = { body: base.body, dark: base.dark, light: base.light };
    if (spec.bond === 'shadow') col = { body: mix(col.body, '#2a1a3a', 0.45), dark: mix(col.dark, '#120818', 0.5), light: mix(col.light, '#6a4a8a', 0.5) };
    if (spec.bond === 'radiant') col = { body: mix(col.body, '#ffffff', 0.12), dark: col.dark, light: mix(col.light, '#ffffff', 0.3) };

    const scale = [0.62, 0.74, 0.86, 0.96][spec.stage];
    const body = BODIES[spec.trait];
    const silhouette = opts.silhouette;
    let inner =
      backFeatures(spec, col) +
      `<ellipse cx="-24" cy="56" rx="16" ry="9" fill="${col.dark}"/><ellipse cx="24" cy="56" rx="16" ry="9" fill="${col.dark}"/>` +
      `<path d="${body}" fill="${col.body}" stroke="${col.dark}" stroke-width="3"/>` +
      frontFeatures(spec, col);

    let bg = aura(spec.bond, id);
    if (silhouette) {
      bg = '';
      inner = `<g filter="url(#sil${id})">${inner}</g>`;
      bg = `<defs><filter id="sil${id}"><feColorMatrix type="matrix" values="0 0 0 0 0.18  0 0 0 0 0.16  0 0 0 0 0.26  0 0 0 1 0"/></filter></defs>`;
    }

    return (
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="creature-svg${opts.cls ? ' ' + opts.cls : ''}" role="img">` +
      bg +
      `<ellipse cx="100" cy="182" rx="${54 * scale}" ry="8" fill="#000" opacity="0.18"/>` +
      `<g transform="translate(100,${118 - (1 - scale) * 30}) scale(${scale})">${inner}</g>` +
      `</svg>`
    );
  };

  CF.specFor = function (c) {
    const f = CF.FORMS[c.formId];
    return { stage: f.stage, trait: f.trait, temperament: f.temperament, style: f.style, bond: f.bond, element: c.element };
  };

  CF.formSVG = function (formId, element, opts) {
    const f = CF.FORMS[formId];
    return CF.creatureSVG({ stage: f.stage, trait: f.trait, temperament: f.temperament, style: f.style, bond: f.bond, element: element || f.element || 'wind' }, opts);
  };

  CF.eggSVG = function (cracked) {
    return (
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="creature-svg egg-svg">` +
      `<ellipse cx="100" cy="182" rx="40" ry="7" fill="#000" opacity="0.18"/>` +
      `<path d="M100,30 C140,30 160,100 160,130 C160,165 132,182 100,182 C68,182 40,165 40,130 C40,100 60,30 100,30 Z" fill="#f5ecd8" stroke="#8a7a5a" stroke-width="3"/>` +
      `<circle cx="80" cy="90" r="9" fill="#e8c88a"/><circle cx="122" cy="120" r="12" fill="#e8c88a"/><circle cx="90" cy="150" r="7" fill="#e8c88a"/>` +
      (cracked ? `<path d="M60,110 L78,100 L90,116 L104,98 L118,114 L132,100 L142,108" fill="none" stroke="#5a4a2a" stroke-width="3" stroke-linejoin="round"/>` : '') +
      `</svg>`
    );
  };
})(typeof window !== 'undefined' ? window : globalThis);
