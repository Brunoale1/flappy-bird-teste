import { GameConfig } from './types';

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 600;

export const CONFIG: GameConfig = {
  gravity: 0.25,
  jumpStrength: -5.5,
  pipeSpeed: 2.5,
  pipeSpawnRate: 140,
  pipeGap: 160,
  birdRadius: 14
};

export const COLORS = {
  sky: '#4ec0ca',
  ground: '#ded895',
  groundBorder: '#73bf2e',
  bird: '#f4ce42',
  pipe: '#73bf2e',
  pipeBorder: '#558c22',
  textShadow: '2px 2px 0 #000'
};