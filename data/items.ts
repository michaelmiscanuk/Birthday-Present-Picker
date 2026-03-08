import type { Item } from '@/types';

/**
 * Edit this list to customise what guests can bring.
 * Only `name` and `emoji` matter here; `pickedBy` is always null at init.
 */
export const DEFAULT_ITEMS: Item[] = [
  { id: '1',  name: 'Jednorožec plyšák',        emoji: '🦄', pickedBy: null },
  { id: '2',  name: 'Sada na tvoření',           emoji: '🎨', pickedBy: null },
  { id: '3',  name: 'Pohádkové knížky',          emoji: '📚', pickedBy: null },
  { id: '4',  name: 'Play-Doh modelína',         emoji: '🌈', pickedBy: null },
  { id: '5',  name: 'Kostým princezny',          emoji: '👑', pickedBy: null },
  { id: '6',  name: 'Puzzle',                    emoji: '🧩', pickedBy: null },
  { id: '7',  name: 'Panenka',                   emoji: '🪆', pickedBy: null },
  { id: '8',  name: 'Hudební hračka',            emoji: '🎵', pickedBy: null },
  { id: '9',  name: 'Bublifuk',                  emoji: '🫧', pickedBy: null },
  { id: '10', name: 'Pastelky a omalovánky',     emoji: '🖍️', pickedBy: null },
  { id: '11', name: 'Hračky do koupele',         emoji: '🛁', pickedBy: null },
  { id: '12', name: 'Čajová souprava',           emoji: '🫖', pickedBy: null },
];
