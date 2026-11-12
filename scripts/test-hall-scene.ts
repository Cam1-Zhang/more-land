import assert from 'node:assert/strict';
import { HALL, INITIAL_HALL_OCCUPANTS, getHallViewport, assignHallSeats, fitHallOccupants, getHallSeats, moveHallOccupant } from '../src/constants/hallScene';

for (const count of [6, 12] as const) {
  const seats = getHallSeats(count);
  assert.equal(seats.length, count);
  assert.equal(new Set(seats.map(seat => seat.id)).size, count);
  assert.ok(seats.some(seat => seat.behindTable));
  assert.ok(seats.some(seat => !seat.behindTable));
  for (const seat of seats) {
    assert.ok(seat.x >= 36 && seat.x + 36 <= HALL.width);
    assert.ok(seat.y >= 100 && seat.y + 19 <= HALL.height);
    if (seat.x < HALL.seatCenter.x - 230) assert.equal(seat.facing, 'right');
    if (seat.x > HALL.seatCenter.x + 230) assert.equal(seat.facing, 'left');
  }
  const fitted = fitHallOccupants(INITIAL_HALL_OCCUPANTS, count);
  assert.equal(new Set(fitted.map(actor => actor.seatId)).size, fitted.length);
  assert.ok(fitted.every(actor => seats.some(seat => seat.id === actor.seatId)));
  const swapped = moveHallOccupant(fitted, 'toby', fitted[1].seatId);
  assert.equal(swapped[0].seatId, fitted[1].seatId);
  assert.equal(swapped[1].seatId, fitted[0].seatId);
  const empty = seats.find(seat => fitted.every(actor => actor.seatId !== seat.id))!;
  const moved = moveHallOccupant(fitted, 'momo', empty.id);
  assert.equal(moved[0], fitted[0]);
  assert.equal(moved[1].seatId, empty.id);
}
assert.deepEqual(INITIAL_HALL_OCCUPANTS.map(actor => actor.seatId), [11, 1]);
// Both games support different sizes. Match order can include arbitrary AI IDs,
// and must stay stable as players die or the roster is restored.
for (const count of [5, 6, 7, 8, 9, 10, 12]) {
  const players = Array.from({ length: count }, (_, i) => ({ id: i === 2 ? 'me' : String(48 - i), name: `Player ${i}`, isAlive: true }));
  const assigned = assignHallSeats(players);
  assert.deepEqual(assigned.map(p => p.id), players.map(p => p.id));
  assert.equal(new Set(assigned.map(p => p.seatId)).size, count);
  const afterDeath = assignHallSeats(players.map((p, i) => ({ ...p, isAlive: i !== 1 })));
  assert.deepEqual(afterDeath.map(p => p.seatId), assigned.map(p => p.seatId));
  for (const seat of getHallSeats(count)) {
    assert.ok(seat.x - 42 >= 0);
    assert.ok(seat.x + 42 <= HALL.width);
    assert.ok(seat.y - 114 >= 0);
    assert.ok(seat.y + 25 <= HALL.height);
  }
}
// Match the former full-screen Image contain layout, including its frozen pan.
for (const [width, height, pan, expectedScale, expectedLeft, expectedTop] of [
  [1024, 576, -92, 1, -92, 0],
  [800, 900, -72, 0.78125, -72, 225],
  [1600, 600, -144, 600 / 576, 122 + 2 / 3, 0],
]) {
  const viewport = getHallViewport(width, height, pan);
  assert.ok(Math.abs(viewport.scale - expectedScale) < 1e-9);
  assert.ok(Math.abs(viewport.left - expectedLeft) < 1e-9);
  assert.ok(Math.abs(viewport.top - expectedTop) < 1e-9);
}
const portrait = getHallViewport(800, 900, -72);
assert.equal(portrait.left + HALL.table.left * portrait.scale, 108.46875);
assert.equal(portrait.top + HALL.table.top * portrait.scale, 370.3125);
assert.equal(HALL.table.width * portrait.scale, 337.5);
assert.equal(HALL.table.height * portrait.scale, 235.9375);
console.log('Hall scene passed: seating, stable roster assignments and original full-screen backdrop/table geometry.');
