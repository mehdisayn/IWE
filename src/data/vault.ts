import type { Vault } from "../types";

const files: Record<string, string> = {};

files["README.md"] = `# The Salt Road

A novel in progress. Working draft — do not circulate.

> *"The sea remembers every name it has ever drowned."*

## Status

| Part | Chapters | State |
| --- | --- | --- |
| One — The Harbor | 1–4 | drafting |
| Two — The Crossing | 5–9 | outlined |
| Three — The Far Shore | 10–14 | notes only |

Current focus: finishing **Chapter 3**. See [[Outline]] for the full map and
[[Characters]] for the cast. Worldbuilding lives in [[Worldbuilding]].

## Conventions

- Scene breaks use a centered \`* * *\`
- POV is close third, present tense
- Place names are *italic* on first use, roman after

\`\`\`
wordcount target  — 95,000
current draft      — 41,280
deadline           — 2026-09-01
\`\`\`
`;

files["Manuscript/Outline.md"] = `# Outline — The Salt Road

The whole shape of the thing, one line per beat. Keep it honest.

## Part One — The Harbor

1. **The Harbor** — Mira works the salt docks of *Coral Quay*. The tide-bell rings
   wrong. A ship arrives that no one signaled.
2. **The Manifest** — Mira reads a cargo list she was never meant to see. A name
   on it is her mother's, twenty years dead.
3. **The Customs House** — She trades a favor to the harbormaster, [[Characters#老 Edran]],
   for one night with the ledgers. What she finds doesn't add up.
4. **Low Tide** — The ship leaves before dawn. Mira is on it.

## Part Two — The Crossing

5. The open water. The crew that does not speak.
6. Storm. The first of the *salt-dreams*.
7. Landfall on the wrong map.

> Note: the crossing is where the book either earns the reader or loses them.
> Compress ruthlessly. See [[Ideas#Pacing]].

## Part Three — The Far Shore

- [ ] Find the actual ending before drafting Part Three
- [x] Decide Mira's mother is alive
- [ ] Decide whether the reader knows before Mira does
`;

files["Manuscript/Chapter 01 — The Harbor.md"] = `# Chapter One — The Harbor

The tide-bell rang a quarter-tone flat, and Mira knew before she looked up that
the day had already gone wrong.

She set down the salt-rake and listened. Forty years the bell had hung over
*Coral Quay*, and forty years it had rung true on the turn of the tide — her
grandmother had set her watch by it, and her grandmother's grandmother before
that. A flat bell meant a cracked bell, and a cracked bell meant a ship had
struck it coming in too fast, in the dark, unsignaled.

* * *

The harbor was the color of a bruise. Low cloud, low water, the salt pans
stretching out grey and geometric toward the breakwater. Mira walked the
catwalk between the evaporation beds, counting hulls out of habit. Twelve
fishing skiffs. The customs cutter. The old dredger that hadn't moved in a
season.

And a thirteenth.

A black-hulled brig sat at the deep mooring, riding high and empty, sails
furled tight as a fist. No flag. No name on the transom — or rather, a name
that had been *painted over*, the ghost of the letters still raised under the
fresh pitch like a scar you could read with your fingers.

> "You signal that one in?" she called down to old Edran in the customs house.

He didn't look up from his ledger. "Nobody signaled it in."

## What Mira does not yet know

- The brig has been here before. Twenty years ago. (→ [[Timeline]])
- Her mother's name is in its hold.
- She will be aboard it by Low Tide. (→ [[Outline#Part One — The Harbor]])
`;

files["Manuscript/Chapter 02 — The Manifest.md"] = `# Chapter Two — The Manifest

The manifest was four pages of a dead language and one line of a living one.

Edran kept the customs ledgers in a strongbox that hadn't been oiled since the
war, and it shrieked when Mira lifted the lid. She froze. Listened. The
customs house ticked and settled around her. Outside, the flat bell rang the
half-hour, wrong.

She found the brig's entry where there should have been none.

\`\`\`
VESSEL:    (name struck)
ORIGIN:    Far Shore — port unrecorded
CARGO:     salt, 40 casks
           "passage, 1" — see annex
MASTER:    (no mark)
\`\`\`

Forty casks of salt, carried *to* a salt town. That was the first wrong thing.
You did not haul salt across the world to *Coral Quay*; the Quay drowned in it.
You might as well ship rain to the sea.

The second wrong thing was the annex.

She turned the page and the cabin lamp guttered and for a moment she read her
own surname in her own mother's hand, twenty years after they'd buried an empty
box with that name carved into the lid.

*Passage, one.*

Liana Vell.

---

See also: [[Characters#Liana Vell]] · [[Worldbuilding#Salt & Currency]]
`;

files["Manuscript/Chapter 03 — The Customs House.md"] = `# Chapter Three — The Customs House

*[DRAFTING — this is the chapter that's giving me trouble. The favor Mira trades
Edran has to cost her something the reader can feel. Right now it's free.]*

"One night," Mira said. "The ledgers. Then I put the box back and you never saw
me."

Edran was a long time answering. He had a way of folding a problem into smaller
and smaller halves until it fit somewhere he could live with it.

"And in return?"

Here was the thing she had not let herself plan to say. "In return," she said,
"I don't tell the council you've been logging half the catch."

* * *

**TODO**: the betrayal lands flat because we don't know Edran yet. Options:

1. Move some of his warmth from Ch.1 to here so the threat *costs* her a friend
2. Give him a daughter on one of the twelve skiffs — make the stakes physical
3. Cut the blackmail entirely; let her trade something of her mother's

I keep circling option 3. See [[Ideas#The price of the ledger]].
`;

files["Research/Worldbuilding.md"] = `# Worldbuilding

## Salt & Currency

In the towns of the inner coast, salt is not seasoning — it is *memory* made
solid. A cask of salt from a given pan carries the taste of the year it was
drawn: a drought year is sharp and bitter, a fat year almost sweet. Old
families keep a *memory-cask* the way other people keep photographs.

This is why shipping salt *to* a salt town is an obscenity, and also a message.

## Geography

- **Coral Quay** — the salt town. Built on the pans. Pop. ~4,000.
- **The Crossing** — open water, three weeks under sail in fair weather.
- **The Far Shore** — unmapped on Quay charts. The brig came from there.

## The Salt-Dreams

Sailors who cross the deep water without a memory-cask begin to dream in
borrowed lives. The longer the crossing, the less sure they are which life is
theirs. (This is the engine of Part Two — see [[Outline#Part Two — The Crossing]].)

> Rule for myself: the salt-dreams are never *explained*. They are weather.
`;

files["Research/Characters.md"] = `# Characters

## Mira Vell
Salt-worker, 31. Reads three dead languages, which is two more than anyone at
*Coral Quay* thinks is healthy. Wants: to stop waiting for a grief that already
happened. Flaw: mistakes leaving for courage.

## Liana Vell
Mira's mother. Presumed drowned twenty years ago; an empty box was buried.
The manifest in [[Chapter 02 — The Manifest]] suggests otherwise. Whether she
is a person or a place by the time Mira finds her is the central question.

## 老 Edran
Harbormaster, 60s. Keeps the customs house and skims the catch. Warm until he
isn't. The reader should like him before they distrust him — see the open
problem in [[Chapter 03 — The Customs House]].

## The Master
Captain of the black brig. Does not speak. May not be one person.
`;

files["Research/Timeline.md"] = `# Timeline

| Year | Event |
| --- | --- |
| –20 | The brig's first visit. Liana Vell vanishes; empty box buried. |
| –12 | The tide-bell cracks the first time; recast. |
| –1  | Edran begins under-logging the catch. |
| 0   | **Chapter 1.** Bell rings flat. Brig returns. |
| +1d | Mira reads the manifest (Ch.2). |
| +2d | The favor; the ledgers (Ch.3). |
| +3d | Low tide. Mira sails. |

All dates relative to the morning the brig returns. Keep this open while
drafting — Part Two will push some of these.
`;

files["Notes/Ideas.md"] = `# Ideas — loose, unsorted

## Pacing
The crossing (Part Two) wants to be SHORT on the page even though it's long in
story-time. Three weeks in twelve pages. Use the salt-dreams to skip.

## The price of the ledger
What if Mira pays Edran not with a threat but with her mother's memory-cask —
the one physical thing she has left? Then she's already given up the past to
chase it. That's the book in one gesture. → fold into [[Chapter 03 — The Customs House]].

## Title alternatives
- The Salt Road *(current)*
- A Cask of Years
- The Far Shore
- ~~Bitter Water~~ (too on the nose)

## Random
- The bell should ring *true* in the very last line of the book.
- Does Mira ever learn to swim? She works on water and can't swim. Use it.
`;

files["Notes/Daily/2026-06-03.md"] = `# 2026-06-03

Wrote 900 words on Ch.3, cut 600. Net 300. The blackmail still isn't working.

- [x] Reread [[Chapter 01 — The Harbor]] for Edran's warmth
- [ ] Try option 3 (the memory-cask) — see [[Ideas#The price of the ledger]]
- [ ] Email agent re: deadline

Tomorrow: stop drafting Ch.3 cold and instead write the *cost* as a standalone
scene. Find the feeling first, fit it in after.

---

Mood: stuck but not despairing. The book knows what it wants; I'm just slow.
`;

export const VAULT: Vault = {
  repo: "salt-road",
  branch: "main",
  folderName: "the-salt-road",
  tree: [
    { type: "file", name: "README.md", path: "README.md" },
    {
      type: "folder",
      name: "Manuscript",
      path: "Manuscript",
      open: true,
      children: [
        { type: "file", name: "Outline.md", path: "Manuscript/Outline.md" },
        { type: "file", name: "Chapter 01 — The Harbor.md", path: "Manuscript/Chapter 01 — The Harbor.md", git: "M" },
        { type: "file", name: "Chapter 02 — The Manifest.md", path: "Manuscript/Chapter 02 — The Manifest.md" },
        { type: "file", name: "Chapter 03 — The Customs House.md", path: "Manuscript/Chapter 03 — The Customs House.md", git: "M" },
      ],
    },
    {
      type: "folder",
      name: "Research",
      path: "Research",
      open: true,
      children: [
        { type: "file", name: "Worldbuilding.md", path: "Research/Worldbuilding.md" },
        { type: "file", name: "Characters.md", path: "Research/Characters.md", git: "A" },
        { type: "file", name: "Timeline.md", path: "Research/Timeline.md" },
      ],
    },
    {
      type: "folder",
      name: "Notes",
      path: "Notes",
      open: false,
      children: [
        { type: "file", name: "Ideas.md", path: "Notes/Ideas.md" },
        {
          type: "folder",
          name: "Daily",
          path: "Notes/Daily",
          open: false,
          children: [
            { type: "file", name: "2026-06-03.md", path: "Notes/Daily/2026-06-03.md" },
          ],
        },
      ],
    },
  ],
  files,
  git: {
    repo: "salt-road",
    branch: "main",
    ahead: 2,
    changes: [
      { path: "Manuscript/Chapter 01 — The Harbor.md", status: "M", staged: false, add: 12, del: 3 },
      { path: "Manuscript/Chapter 03 — The Customs House.md", status: "M", staged: false, add: 41, del: 18 },
      { path: "Research/Characters.md", status: "A", staged: false, add: 22, del: 0 },
      { path: "Notes/Daily/2026-06-02.md", status: "D", staged: false, add: 0, del: 9 },
    ],
    repos: ["salt-road", "salt-road-notes (private)", "blog"],
  },
};
