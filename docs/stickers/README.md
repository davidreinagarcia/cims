<!-- summary: Link and QR code for each building door sticker; how the links work and what to confirm on site. -->
# Door stickers

Each sticker (QR or NFC tag) holds a link that opens CIMS on that building with the door you are standing at already set as the start. The visitor only types where they want to go.

Link format: `https://cims.queenalexandria.online/?in=<building>&door=<entrance id>`. An unknown door falls back to the building's first entrance; an unknown building opens the normal map.

| Building | Door | Level | Link | QR |
|---|---|---|---|---|
| The Kendeda Building for Innovative Sustainable Design | West entrance | 1 | `https://cims.queenalexandria.online/?in=kendeda&door=west` | [kendeda-west.svg](kendeda-west.svg) |
| The Kendeda Building for Innovative Sustainable Design | East entrance | 1 | `https://cims.queenalexandria.online/?in=kendeda&door=east` | [kendeda-east.svg](kendeda-east.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 1 upper exit | 1 | `https://cims.queenalexandria.online/?in=culc&door=e1-n` | [culc-e1-n.svg](culc-e1-n.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 1 lower exit | 1 | `https://cims.queenalexandria.online/?in=culc&door=e1-s` | [culc-e1-s.svg](culc-e1-s.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 2 upper exit | 2 | `https://cims.queenalexandria.online/?in=culc&door=e2-n` | [culc-e2-n.svg](culc-e2-n.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 2 lower exit | 2 | `https://cims.queenalexandria.online/?in=culc&door=e2-s` | [culc-e2-s.svg](culc-e2-s.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 3 upper exit | 3 | `https://cims.queenalexandria.online/?in=culc&door=e3-n` | [culc-e3-n.svg](culc-e3-n.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 3 lower exit | 3 | `https://cims.queenalexandria.online/?in=culc&door=e3-s` | [culc-e3-s.svg](culc-e3-s.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 4 upper exit | 4 | `https://cims.queenalexandria.online/?in=culc&door=e4-n` | [culc-e4-n.svg](culc-e4-n.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 4 lower exit | 4 | `https://cims.queenalexandria.online/?in=culc&door=e4-s` | [culc-e4-s.svg](culc-e4-s.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 5 upper exit | 5 | `https://cims.queenalexandria.online/?in=culc&door=e5-n` | [culc-e5-n.svg](culc-e5-n.svg) |
| G. Wayne Clough Undergraduate Learning Commons | Level 5 lower exit | 5 | `https://cims.queenalexandria.online/?in=culc&door=e5-s` | [culc-e5-s.svg](culc-e5-s.svg) |

## Before printing

- The door positions come from schematic plans and are approximate. Walk the building and match each sticker to the right entrance name; rename entrances in `src/data/indoor/*.json` if needed (the id in the link must keep matching).
- Test each sticker with a phone before sticking it. NFC tags need the link written as a URL record.
- QR codes encode the production address, so they only work once the branch is merged to `main`.
- Add a short readable line under the QR, for example "Find your room: cims.queenalexandria.online".

## For maintenance staff

Use the **Door stickers** tab of the maintenance dashboard (sign in as maintenance, menu → Maintenance dashboard → Door stickers, or `/?view=maintenance`). Pick a building, tick the doors you need, then copy each link, download its QR as SVG or PNG, or press **Print** for a sheet with the QR, building, door name and a readable address. The list is built from `src/data/indoor/*.json`, so new entrances and buildings appear by themselves. Links always use the production address unless you tick the test option. Scan every sticker after sticking it; if it opens the wrong door, tell the CIMS team the door name so the entrance is renamed or moved in the data. The static `.svg` files in this folder are kept as a backup.

Still planned from US-10.5: an Installed / Verified state per door and a "wrong door" flag.
