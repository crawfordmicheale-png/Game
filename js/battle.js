/*
 * Turn-based battles. Every move is either Aggressive or Tactical, and the
 * moves you pick are recorded on your creature: they decide its battle style
 * (stage 2 branch) and nudge its traits.
 */
(function (g) {
  const CF = (g.CF = g.CF || {});

  CF.MOVES = {
    strike: { id: 'strike', name: 'Strike', icon: '👊', style: 'aggressive', desc: 'A reliable attack.' },
    frenzy: { id: 'frenzy', name: 'Frenzy', icon: '💥', style: 'aggressive', desc: 'Huge hit that may miss. Leaves you exposed.' },
    guard: { id: 'guard', name: 'Guard', icon: '🛡️', style: 'tactical', desc: 'Block 70% of damage this turn and recover some HP.' },
    focus: { id: 'focus', name: 'Focus', icon: '🎯', style: 'tactical', desc: 'Your next attack deals double damage and cannot miss.' },
    feint: { id: 'feint', name: 'Feint', icon: '🌀', style: 'tactical', desc: 'Read an incoming attack: dodge it and counter. Wit improves the odds.' },
  };

  CF.TIERS = {
    rookie: { label: 'Rookie', factor: 0.8, desc: 'A weaker wild creature.' },
    rival: { label: 'Rival', factor: 1.0, desc: 'An evenly matched trainer.' },
    champion: { label: 'Champion', factor: 1.25, desc: 'A seasoned fighter. Risky.' },
  };

  CF.statsFor = function (c) {
    const t = c.traits;
    const s = c.stage;
    return {
      maxHp: Math.round(40 + s * 20 + t.guard * 1.5 + t.might * 0.6 + t.heart * 0.4),
      atk: 6 + s * 4 + t.might * 0.6 + t.fury * 0.6,
      def: 3 + s * 3 + t.guard * 0.6,
      spd: 5 + s * 2 + t.swift * 0.8,
      wit: t.wit,
      heart: t.heart,
      swift: t.swift,
    };
  };

  // Builds a wild opponent at the same stage as the player, with a similar
  // total amount of training scaled by tier.
  CF.makeOpponent = function (player, tierId) {
    const tier = CF.TIERS[tierId];
    const form = CF.pick(CF.formsAtStage(player.stage));
    const element = CF.pick(Object.keys(CF.ELEMENTS));
    const total = CF.TRAITS.reduce((a, t) => a + player.traits[t], 0);
    const budget = Math.max(12, total) * tier.factor;
    const weights = {};
    CF.TRAITS.forEach((t) => (weights[t] = 0.4 + CF.rand()));
    weights[form.trait] += 2.5;
    const wsum = CF.TRAITS.reduce((a, t) => a + weights[t], 0);
    const traits = {};
    CF.TRAITS.forEach((t) => (traits[t] = Math.round((budget * weights[t]) / wsum)));
    return {
      id: 'opp',
      nickname: (tierId === 'champion' ? 'Champion ' : tierId === 'rival' ? 'Rival ' : 'Wild ') + form.name,
      formId: form.id,
      stage: player.stage,
      element,
      traits,
      style: form.style || (CF.rand() < 0.5 ? 'aggressive' : 'tactical'),
      bias: form.trait,
    };
  };

  function elementMult(attEl, defEl) {
    if (CF.ELEMENT_BEATS[attEl] === defEl) return 1.5;
    if (CF.ELEMENT_BEATS[defEl] === attEl) return 0.75;
    return 1;
  }
  CF.elementMult = elementMult;

  function fighter(c) {
    const st = CF.statsFor(c);
    return { c, st, hp: st.maxHp, focused: false, exposed: false, guarding: false, feinting: false, endured: false };
  }

  CF.Battle = class {
    constructor(player, opponent, tierId) {
      this.tierId = tierId;
      this.p = fighter(player);
      this.o = fighter(opponent);
      this.turn = 0;
      this.log = [`A ${opponent.nickname} appears!`];
      this.used = { aggressive: 0, tactical: 0 };
      this.over = false;
      this.winner = null;
    }

    enemyMove() {
      const o = this.o;
      const aggressive = o.c.style === 'aggressive';
      if (o.focused) return CF.rand() < 0.8 ? 'strike' : 'frenzy';
      const lowHp = o.hp < o.st.maxHp * 0.35;
      const w = aggressive
        ? { strike: 4, frenzy: 3, guard: lowHp ? 2 : 1, focus: 1, feint: 1 }
        : { strike: 2, frenzy: 1, guard: lowHp ? 3 : 2, focus: 2, feint: 2 };
      const total = Object.values(w).reduce((a, b) => a + b, 0);
      let r = CF.rand() * total;
      for (const [m, wt] of Object.entries(w)) {
        if ((r -= wt) < 0) return m;
      }
      return 'strike';
    }

    damage(att, def, mult) {
      const base = att.st.atk * (0.85 + CF.rand() * 0.3) - def.st.def * 0.5;
      let dmg = Math.max(2, base) * mult * elementMult(att.c.element, def.c.element);
      if (att.focused) {
        dmg *= 2;
        att.focused = false;
      }
      if (def.exposed) dmg *= 1.4;
      const crit = CF.rand() < 0.05 + att.st.swift * 0.003;
      if (crit) dmg *= 1.5;
      return { dmg, crit };
    }

    hit(att, def, mult, lines, label) {
      const name = att.c.nickname;
      if (def.feinting) {
        const dodge = Math.min(0.8, 0.45 + def.st.wit * 0.012);
        if (CF.rand() < dodge) {
          const counter = this.damage(def, att, 1);
          this.applyDamage(att, Math.round(counter.dmg), lines);
          lines.push(`${def.c.nickname} read the ${label} and countered for ${Math.round(counter.dmg)}!`);
          return;
        }
        lines.push(`${def.c.nickname}'s feint failed!`);
      }
      let { dmg, crit } = this.damage(att, def, mult);
      if (def.guarding) dmg *= 0.3;
      dmg = Math.round(dmg);
      const eff = elementMult(att.c.element, def.c.element);
      this.applyDamage(def, dmg, lines);
      lines.push(
        `${name} used ${label} for ${dmg} damage${crit ? ' (critical!)' : ''}${eff > 1 ? ". It's super effective!" : eff < 1 ? '. Not very effective...' : '.'}`
      );
    }

    applyDamage(f, dmg, lines) {
      f.hp -= dmg;
      if (f.hp <= 0 && !f.endured) {
        const endure = Math.min(0.4, f.st.heart * 0.015);
        if (CF.rand() < endure) {
          f.hp = 1;
          f.endured = true;
          lines.push(`${f.c.nickname} endured the hit through sheer heart!`);
        }
      }
      f.hp = Math.max(0, f.hp);
    }

    act(f, foe, move, lines) {
      if (f.hp <= 0 || this.over) return;
      const name = f.c.nickname;
      if (move === 'strike') {
        f.exposed = false;
        this.hit(f, foe, 1, lines, 'Strike');
      } else if (move === 'frenzy') {
        f.exposed = true;
        const acc = Math.min(0.95, 0.72 + f.st.swift * 0.006);
        if (f.focused || CF.rand() < acc) this.hit(f, foe, 1.7, lines, 'Frenzy');
        else {
          f.focused = false;
          lines.push(`${name}'s Frenzy missed wildly!`);
        }
      } else if (move === 'guard') {
        f.exposed = false;
        const heal = Math.round(f.st.maxHp * 0.1);
        f.hp = Math.min(f.st.maxHp, f.hp + heal);
        lines.push(`${name} braced itself (+${heal} HP).`);
      } else if (move === 'focus') {
        f.exposed = false;
        f.focused = true;
        lines.push(`${name} is focusing...`);
      } else if (move === 'feint') {
        f.exposed = false;
        if (!(foe.lastMove === 'strike' || foe.lastMove === 'frenzy')) lines.push(`${name} feinted, but there was nothing to counter.`);
      }
      if (foe.hp <= 0) this.finish(f === this.p ? 'player' : 'opponent', lines);
      else if (f.hp <= 0) this.finish(f === this.p ? 'opponent' : 'player', lines);
    }

    finish(winner, lines) {
      this.over = true;
      this.winner = winner;
      lines.push(winner === 'player' ? `${this.o.c.nickname} fainted. You win!` : `${this.p.c.nickname} fainted. You lost...`);
    }

    // Resolve one full turn with the player's chosen move.
    choose(moveId) {
      if (this.over) return [];
      const move = CF.MOVES[moveId];
      this.used[move.style]++;
      const enemy = this.enemyMove();
      const lines = [];
      this.turn++;

      const p = this.p;
      const o = this.o;
      p.lastMove = moveId;
      o.lastMove = enemy;
      // Guard and feint are stances: they take effect before anyone attacks.
      p.guarding = moveId === 'guard';
      p.feinting = moveId === 'feint';
      o.guarding = enemy === 'guard';
      o.feinting = enemy === 'feint';

      const pFirst = p.st.spd > o.st.spd || (p.st.spd === o.st.spd && CF.rand() < 0.5);
      const order = pFirst ? [[p, o, moveId], [o, p, enemy]] : [[o, p, enemy], [p, o, moveId]];
      order.forEach(([f, foe, m]) => this.act(f, foe, m, lines));

      p.guarding = p.feinting = o.guarding = o.feinting = false;
      this.log.push(...lines);
      return lines;
    }

    forfeit() {
      if (this.over) return;
      const lines = [];
      this.finish('opponent', lines);
      lines[lines.length - 1] = `${this.p.c.nickname} fled the battle.`;
      this.log.push(...lines);
    }
  };

  // Applies the outcome of a finished battle to the player's creature and
  // returns a summary of what changed.
  CF.applyBattleResult = function (c, battle) {
    const out = [];
    const won = battle.winner === 'player';
    const u = battle.used;
    c.battles.aggressive += u.aggressive;
    c.battles.tactical += u.tactical;
    if (won) c.battles.wins++;
    else c.battles.losses++;

    // Fighting shapes the body too.
    const fury = Math.min(3, u.aggressive * 0.4);
    const might = Math.min(2, u.aggressive * 0.2);
    const wit = Math.min(3, u.tactical * 0.35);
    const guard = Math.min(2, u.tactical * 0.25);
    CF.addTrait(c, 'fury', fury);
    CF.addTrait(c, 'might', might);
    CF.addTrait(c, 'wit', wit);
    CF.addTrait(c, 'guard', guard);

    const tiredBefore = c.needs.energy < 30;
    CF.adjust(c, 'energy', -20);
    CF.adjust(c, 'hygiene', -10);
    CF.adjust(c, 'fullness', -10);
    if (won) {
      CF.adjust(c, 'mood', battle.tierId === 'champion' ? 25 : 12);
      CF.adjust(c, 'bond', battle.tierId === 'champion' ? 3 : 1);
    } else {
      CF.adjust(c, 'mood', -10);
    }
    if (tiredBefore) {
      CF.adjust(c, 'bond', -3);
      out.push(`${c.nickname} was already tired. Making it fight hurt your bond.`);
    }
    out.unshift(
      `${won ? 'Victory' : 'Defeat'}! Moves used: ${u.aggressive} aggressive, ${u.tactical} tactical.`,
      `Fury +${fury.toFixed(1)}, Might +${might.toFixed(1)}, Wit +${wit.toFixed(1)}, Guard +${guard.toFixed(1)}.`
    );
    CF.log(c, `${won ? 'Won' : 'Lost'} a battle against ${battle.o.c.nickname}.`);
    return out;
  };

  CF.canBattle = function (c) {
    if (c.stage < 1) return { ok: false, why: `Must reach the ${CF.STAGE_NAMES[1]} stage before battling.` };
    if (c.ap <= 0) return { ok: false, why: 'No actions left today.' };
    if (c.sick) return { ok: false, why: 'Too sick to fight.' };
    if (c.needs.energy < 10) return { ok: false, why: 'Far too exhausted to fight.' };
    return { ok: true };
  };

  // Spends one action and sets up a battle against a fresh opponent.
  CF.startBattle = function (c, tierId) {
    const can = CF.canBattle(c);
    if (!can.ok) return { ok: false, msg: can.why };
    c.ap--;
    return { ok: true, battle: new CF.Battle(c, CF.makeOpponent(c, tierId), tierId) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
