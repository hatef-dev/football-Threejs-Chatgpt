export const CONFIG = {
  pitchLength: 110,
  pitchWidth: 68,
  goalWidth: 14,
  goalDepth: 4.5,
  penaltyDepth: 16.5,
  penaltyWidth: 40,
  centerCircleRadius: 9.15,
  playerRadius: 1.05,
  ballRadius: 0.38,
  matchSeconds: 180,
  homeColor: 0x2f7df6,
  awayColor: 0xf04c45,
  keeperColor: 0xf3c944
};

CONFIG.halfLength = CONFIG.pitchLength / 2;
CONFIG.halfWidth = CONFIG.pitchWidth / 2;
CONFIG.goalHalf = CONFIG.goalWidth / 2;

export const FORMATIONS = {
  home: [
    { role: "GK", x: -51, z: 0, number: 1 },
    { role: "LB", x: -36, z: -24, number: 3 },
    { role: "LCB", x: -39, z: -8, number: 4 },
    { role: "RCB", x: -39, z: 8, number: 5 },
    { role: "RB", x: -36, z: 24, number: 2 },
    { role: "DM", x: -19, z: 0, number: 6 },
    { role: "LCM", x: -7, z: -14, number: 8 },
    { role: "RCM", x: -5, z: 14, number: 10 },
    { role: "LW", x: 13, z: -22, number: 11 },
    { role: "ST", x: 24, z: 0, number: 9 },
    { role: "RW", x: 13, z: 22, number: 7 }
  ],
  away: [
    { role: "GK", x: 51, z: 0, number: 1 },
    { role: "LB", x: 36, z: 24, number: 3 },
    { role: "LCB", x: 39, z: 8, number: 4 },
    { role: "RCB", x: 39, z: -8, number: 5 },
    { role: "RB", x: 36, z: -24, number: 2 },
    { role: "DM", x: 19, z: 0, number: 6 },
    { role: "LCM", x: 7, z: 14, number: 8 },
    { role: "RCM", x: 5, z: -14, number: 10 },
    { role: "LW", x: -13, z: 22, number: 11 },
    { role: "ST", x: -24, z: 0, number: 9 },
    { role: "RW", x: -13, z: -22, number: 7 }
  ]
};
