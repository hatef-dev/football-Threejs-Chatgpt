# Sakura Brick 11v11 Football

A browser-based 3D football game built with **Three.js r160** and **Vanilla JavaScript (ES modules)**.

This project simulates a full **11v11 quick match** on a **110m x 68m** pitch with keyboard/gamepad controls, AI opponents, kickoff and goal flow, and a Sakura-themed environment.

## Credits

- Main implementation and refactor: **ChatGPT-5.3 Codex**

## Features

- 22 players total (11v11)
- Home team (blue) vs away team (red), goalkeeper in yellow
- 3-minute quick match timer
- Core gameplay actions:
  - Pass
  - Through ball
  - Charged shot
  - Player switch
  - Kickoff restart
- Full pitch markings:
  - 110m x 68m field
  - Penalty areas
  - Goals (14m width, 4.5m depth)
  - 12 striped grass bands
- Sakura-themed world props:
  - Torii gate
  - Pagoda
  - Lotus pond
  - Sakura trees
- UI overlay with:
  - Scoreboard
  - Match timer
  - Status text
  - Shot charge bar
  - Goal toast animation

## Tech Stack

- Three.js r160
- Vanilla JavaScript (ES6+ classes, modules)
- HTML/CSS UI overlay

## Project Structure

```text
Football project/
├─ index.html
├─ README.md
└─ src/
   ├─ main.js
   ├─ config/
   │  └─ constants.js
   ├─ core/
   │  ├─ App.js
   │  ├─ EventManager.js
   │  ├─ InputManager.js
   │  ├─ StateManager.js
   │  └─ UIManager.js
   ├─ entities/
   │  ├─ BallEntity.js
   │  └─ PlayerEntity.js
   ├─ services/
   │  └─ APIService.js
   ├─ utils/
   │  └─ math-utils.js
   └─ world/
      └─ WorldBuilder.js
```

## How To Run

Use a local web server (required for ES modules).

### Option 1: Python

```bash
cd "d:\Football project"
python -m http.server 5500
```

Open:

- [http://localhost:5500](http://localhost:5500)

### Option 2: Node.js

```bash
cd "d:\Football project"
npx serve .
```

Open the URL shown in the terminal.

## Controls

### Keyboard

- `WASD`: Move
- `Shift`: Sprint
- `J`: Pass
- `L`: Through ball
- `K` or `Space`: Charged shot (hold and release)
- `Q`: Switch player
- `R`: Restart kickoff

### Xbox Controller

- `Left Stick`: Move
- `RT`: Sprint
- `A`: Switch player
- `Y`: Pass
- `B`: Through ball
- `LB`: Shoot

## Architecture Notes

- `App` is the orchestrator for gameplay loop, simulation updates, and camera.
- `UIManager` handles all DOM updates for HUD, toast, and center messages.
- `InputManager` handles keyboard and gamepad sampling.
- `StateManager` centralizes mutable match state.
- `EventManager` centralizes event listener lifecycle.
- `PlayerEntity` and `BallEntity` encapsulate domain entities and render meshes.
- `WorldBuilder` encapsulates scene/pitch/environment construction.
- `APIService` abstracts local persistence.

## Performance Notes

- Uses `requestAnimationFrame` via Three.js animation loop.
- Shadow map enabled with `2048 x 2048`.
- Frame delta is clamped for simulation stability.

