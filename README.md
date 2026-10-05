# Wildbrood

A creature raising, evolving and battling game. You hatch random creatures and raise them,
and **the way you raise them decides what they evolve into**.

- Two identical hatchlings can become completely different creatures.
- Two different hatchlings raised the same way can end up as the same species.

## Play

There's no build step. Open `index.html` in a browser, or serve the folder:

```sh
npm start          # serves on http://localhost:8080
npm test           # runs the game-logic tests (Node 18+)
```

Progress saves automatically to the browser's local storage.

## How evolution works

| Stage | Forms | Unlocks at | What decides the form |
|---|---|---|---|
| Hatchling | 6 | hatching | random egg |
| Juvenile | 12 | day 4 | **training focus** (6 traits) × **temperament** (Disciplined / Wild) |
| Adult | 24 | day 10 + 3 battles | + **battle style** (Aggressive / Tactical) |
| Apex | 48 | day 18 + 8 battles | + **bond** (Radiant / Shadow) |

Forms aren't a fixed family tree: each one is a combination of raising decisions, and every
decision is judged again at each evolution. A Juvenile raised one way can still become an Adult
of a different line if you change how you treat it.

- **Training focus**: six traits (Might, Swift, Wit, Heart, Guard, Fury). The trait with the highest
  score wins, where score = half of its lifetime total + its growth since the last evolution. This
  lets you steer a creature onto a new path mid-life.
- **Temperament**: a discipline meter. Scolding misbehaviour, proper meals and endurance drills push it
  toward Disciplined. Treats, letting misbehaviour slide, ignoring it and rough sparring push it toward Wild.
- **Battle style**: every move you pick is Aggressive (Strike, Frenzy) or Tactical (Guard, Focus, Feint).
  Battles also train traits: aggressive moves build Fury and Might, tactical moves build Wit and Guard.
- **Bond**: judged each night. A fed, clean, rested, happy creature gains bond. Hunger, filth,
  exhaustion, sickness, low mood and forcing it to fight while tired all lower it.

The hatchling type only gives a small head start in one trait and sets the creature's **element**.
The element stays with it for life (colour and battle matchups):
Water › Fire › Nature › Earth › Storm › Wind › Water.

The art is procedural, so you can read a creature's upbringing from how it looks: trait sets the body
shape, temperament the eyes, battle style adds horns and claws or armour plates, and bond adds a golden
halo or dark wisps.

## Project layout

```
index.html        page shell + how-to-play text
css/style.css     styles (light/dark, mobile friendly)
js/data.js        traits, elements, hatchlings and the 90-form evolution web
js/creature.js    care actions, daily tick, evolution rules (pure logic)
js/battle.js      turn-based battle engine and opponent generation (pure logic)
js/render.js      procedural SVG creature art
js/game.js        UI, modals, save/load
tests/            Node tests for the game logic
```
