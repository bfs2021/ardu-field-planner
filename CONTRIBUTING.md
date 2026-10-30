# Contributing / Як долучитися

**English** · [Українська](#українською)

Field Mission Planner is built by one aviation engineer for real spraying work. You don't need
to write code to help — the most useful contributions come from the field.

## Ways to help, from easiest

1. **Tell us about your field.** Drone, flight controller, field size, what went wrong —
   post in [Show and tell](https://github.com/tecelskyyivan-alt/ardu-field-planner/discussions/categories/show-and-tell).
   One line is already useful.
2. **Answer the 4 questions** in [this thread](https://github.com/tecelskyyivan-alt/ardu-field-planner/discussions/6) —
   they decide what gets built next.
3. **Vote on the roadmap** — 👍 on issues labelled
   [`roadmap`](https://github.com/tecelskyyivan-alt/ardu-field-planner/issues?q=is%3Aopen+label%3Aroadmap).
4. **Report a problem** — [new issue](https://github.com/tecelskyyivan-alt/ardu-field-planner/issues/new/choose).
   Attach the app log: *Log for analysis → save*.
5. **Send a test field** — a KML of a real field (with cut-outs if it has trees, ponds or poles).
   Odd shapes are the most valuable.
6. **Pick a small task** — issues labelled
   [`good first issue`](https://github.com/tecelskyyivan-alt/ardu-field-planner/issues?q=is%3Aopen+label%3A%22good+first+issue%22).

## Working on the code

Setup and architecture: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

- **Frontend** (the app everyone uses): `web-stable/` — plain JS + Leaflet, no build step.
  Open it with `python serve.py`.
- **Route engine**: `backend/` (Python). It runs in the browser through Pyodide from a copy in
  `web-stable/engine/` — after changing `backend/`, run `scripts/sync_engine.sh`.
- **Interface text**: Ukrainian is the source language; English lives in `web-stable/i18n.js`
  (key = exact Ukrainian string). A new UI string needs an entry there — `tests/test_i18n.mjs`
  checks it.

### Before a pull request

Run what CI runs (list in [.github/workflows/tests.yml](.github/workflows/tests.yml)), at least:

```bash
python tests/test_core.py
python tests/test_features.py
python tests/test_ui.py
node tests/test_i18n.mjs
node tests/test_jsmav.mjs
```

- One change per pull request; say **what it fixes in the field**, not only in the code.
- Anything that touches mission upload or MAVLink: say how you tested it (SITL / real drone).
- Safety first — this software flies real aircraft over people's crops.

By contributing you agree your work is released under the project's [GPLv3](LICENSE) licence.

---

## Українською

FMP робить один авіаційний інженер для реальних обприскувань. Щоб допомогти, писати код не
обов'язково — найцінніше приходить із поля.

1. **Розкажи про своє поле** в [Show and tell](https://github.com/tecelskyyivan-alt/ardu-field-planner/discussions/categories/show-and-tell): дрон, контролер, площа, що пішло не так.
2. **Відповідай на 4 питання** в [цьому треді](https://github.com/tecelskyyivan-alt/ardu-field-planner/discussions/6).
3. **Голосуй 👍** за задачі з міткою [`roadmap`](https://github.com/tecelskyyivan-alt/ardu-field-planner/issues?q=is%3Aopen+label%3Aroadmap).
4. **Повідом про проблему** — [нове issue](https://github.com/tecelskyyivan-alt/ardu-field-planner/issues/new/choose), з логом («Лог для аналізу» → зберегти).
5. **Надішли тестове поле** — KML реального поля, з вирізами.
6. **Візьми малу задачу** з міткою [`good first issue`](https://github.com/tecelskyyivan-alt/ardu-field-planner/issues?q=is%3Aopen+label%3A%22good+first+issue%22).

Код: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Перед PR — тести з розділу вище. Внесок
публікується під [GPLv3](LICENSE).
