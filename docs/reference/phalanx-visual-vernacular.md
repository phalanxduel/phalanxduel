---
title: "Phalanx Duel visual vernacular"
description: "Guardrails for Greek language, numerals, and military-inspired ornament in the game UI."
status: active
updated: "2026-09-05"
audience: design, engineering, qa
---

# Phalanx Duel visual vernacular

The visual language should feel like a modern tactical instrument with a
classical memory: crisp neon systems, a compact shield-wall geometry, and
small moments of Greek lettering that reward attention without making the game
harder to read.

## The rule: primary clarity, secondary heritage

- Keep the canonical English/card rank, action label, locator text, and
  accessible name unchanged.
- Use Greek as a secondary inscription, watermark, or translated label.
- Treat ornament as `aria-hidden` and pointer-inert; it must never carry game
  state or become an automation dependency.
- Prefer a restrained shield-band, seal, or column-mark treatment over a full
  historical re-skin.

The first implementation follows this rule: card ranks remain `A`, `K`, `7`,
etc., with a small Greek numeral beside them; `ΦΑΛΑΓΞ` is a low-contrast card
wordmark and card-back seal.

## Working lexicon

| Greek | Transliteration | UI meaning |
|---|---|---|
| φάλαγξ / ΦΑΛΑΓΞ | phálanx | the ordered battle line; the game wordmark |
| σύνταγμα | sýntagma | coordination, ordered combination, the Syntagma pulse |
| ἀγορά | agorá | the linked operator surface or shared hub |
| ἴχνη | íchnē | traces/trails; PVL evidence and scenario history |
| στρατηγός | stratēgós | command/control surface |
| ἀσπίς | aspís | shield; a possible future defensive motif |
| ὅπλον | hóplon | weapon/equipment; use only where mechanics support it |

These are labels and metaphors, not hidden rules. Avoid implying that a modern
card suit, UI status, or feature has a historical Greek equivalent when it does
not.

## Greek numerals

The decorative rank uses the Greek alphabetic numeral convention with the
keraia mark: `Βʹ` for 2, `ϛʹ` for 6, `Ιʹ` for 10, and `ΙΓʹ` for 13. This is
ornament only; the standard rank remains authoritative for players, screen
readers, tests, and telemetry.

## Historical guardrails

- The hoplite shield (`aspis`) is a strong visual reference because it belongs
  to the material logic of close formation: overlap, edge, and shared cover.
- Geometric bands, ochre, bronze, deep blue, and restrained red are safer
  references than literal helmet/warrior imagery; they preserve the existing
  cyber-tactical identity.
- Do not present modern game abstractions as archaeological reconstructions.
  Use “inspired by” language in marketing or documentation.

## Historical field notes for future content

The game’s strongest historical spine is not “all ancient Greece”; it is the
long tactical arc of the ordered heavy-infantry line:

- Classical hoplite armies from city-states including Sparta, Athens, Thebes,
  Corinth, Argos, and Megara fought in related shield-and-spear formations.
- The Theban commander Epaminondas made the oblique concentration at Leuctra
  (371 BCE) a useful reference for asymmetry, pressure, and a decisive wing.
- Philip II of Macedon adapted the older hoplite model into the Macedonian
  phalanx with the two-handed `sarissa`; Alexander carried that combined-arms
  system into the Hellenistic world.
- Antigonid Macedonian, Seleucid, and Ptolemaic armies retained phalangite
  formations, while Rome’s more flexible legion eventually exposed the limits
  of a rigid phalanx when terrain and combined arms broke its frontage.

Socrates, Plato, and Diogenes are better treated as tonal references than as
military factions. Socrates’ service as an Athenian hoplite supports a theme of
discipline and questioning; Plato suggests forms, proportion, and the search
for an ideal pattern; Diogenes suggests irreverence, austerity, and a lantern
for finding what is hidden. These can inform copy, tutorials, analysis modes,
or easter eggs without pretending that the philosophers commanded armies.

For the interface, use the vocabulary of line, file, shield, signal, measure,
and proportion. Let the architecture carry the weight: column rhythm,
frieze-like rules, bronze/stone contrast, and a controlled amount of
terracotta. Avoid literal statues, helmets, or faux parchment as the default
surface.

## Corner geometry

Apple’s public UIKit model distinguishes circular and continuous corner curves,
but does not prescribe one universal device radius. That continuous/squircle
feel belongs on app shells and panels. Physical poker cards are a tighter
reference: approximately 63×88 mm with a small corner radius, commonly around
3 mm. The game therefore uses a roughly 5% short-edge radius for cards and a
larger 12 px continuous-feeling radius for panels. This keeps the card tactile
and the shell premium without making every surface look like a pill.

Reference inspiration:

- [National Archaeological Museum of Athens — Weaponry](https://2500years.culture.gov.gr/en/chapters/oplismos)
- [Metropolitan Museum of Art — Warfare in Ancient Greece](https://www.metmuseum.org/de/essays/warfare-in-ancient-greece)
- [Cambridge Classical Quarterly — Digamma, Koppa, and Sampi as numerals](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/8FF93D1FA8CFDE6688AF9175825BF21C/S0009838800004936a.pdf/the-digamma-koppa-and-sampi-as-numerals-in-greek.pdf)
