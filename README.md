# Gomoku

English | [中文](README.zh-CN.md)

A minimal Gomoku (five in a row) that runs in the browser. It has no ads, no sign-up and no dependencies. It is part of a small set of games with the same look: [Schulte Grid](https://github.com/AlbertHX86/schulte-grid) and [Sudoku](https://github.com/AlbertHX86/sudoku).

**Play online:** https://alberthx86.github.io/gomoku/

## How to play

1. Pick a mode: **Easy**, **Medium** or **Hard** against the computer, or **2 Players** on one device.
2. Black moves first. Against the computer you play black.
3. Tap a point on the 15×15 board to place a stone. Players take turns.
4. The first to get **five or more stones in a row**, horizontally, vertically or diagonally, wins. If the board fills up, it's a draw.
5. The timer starts with the first stone. The last stone played has a blue dot, and the winning line is outlined.
6. Press **Reset** for a new game.

Tip: block your opponent's open threes (three in a row with both ends free) early, and try to build two threats at once.

The top right corner switches between light and dark themes and between English and Chinese. By default the page follows your system theme and browser language.

## Records

Each mode keeps its own records: the running score (you vs computer, or black vs white) and your 10 most recent games with result, number of moves and time. They are stored in your browser's `localStorage`. Nothing is sent anywhere.

- The same browser on the same device keeps your records, online or offline.
- Records do not sync between browsers or devices.
- Clearing browser data deletes them. You can also press **Clear** to delete the records of the current mode.

## Run it locally

The game is three static files, `index.html`, `style.css` and `app.js`, with no build step.

```bash
git clone https://github.com/AlbertHX86/gomoku.git
cd gomoku
```

Then either open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening the file directly and serving it over `localhost` count as different sites to the browser, so they keep separate records.

## Gomoku and the brain

Gomoku means keeping several threats in mind, predicting your opponent and planning ahead, which are jobs the prefrontal cortex is central to. An fMRI study of gomoku tasks found prefrontal and parietal activity during harder moves, and in older adults regular board-game playing has been linked to less cognitive decline. Those studies are small or observational, though, and none shows that gomoku changes your brain. The page's **Research** section summarises them with references.

## License

[MIT](LICENSE)
