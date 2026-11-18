// traffic.js — civilian traffic: cars that cruise the road grid in their
// lane, ease off when the car ahead is close, and sometimes turn at an
// intersection. They are set dressing with a pulse — until Mara steals one,
// at which point the player code drives it and traffic skips it.

import { Car, CAR_COLORS } from './vehicles.js';
import { CITY_HALF, ROAD_SPACING, roadCentre } from './city.js';

const LANE_CENTRES = [];
for (let v = -CITY_HALF + 22; v <= CITY_HALF - 10; v += ROAD_SPACING) LANE_CENTRES.push(v);
const BODY_ROTATION = ['sedan', 'hatch', 'pickup'];

export class Traffic {
  constructor(scene, rand, count = 15) {
    this.rand = rand;
    this.cars = [];
    for (let i = 0; i < count; i++) {
      const vertical = rand() < 0.5;
      const lane = LANE_CENTRES[Math.floor(rand() * LANE_CENTRES.length)];
      const along = -CITY_HALF + rand() * (CITY_HALF * 2 - 30);
      const dir = rand() < 0.5 ? 1 : -1;
      // Right-hand traffic: the lane offset flips with direction and axis.
      const offset = 3 * dir * (vertical ? 1 : -1);
      const car = new Car(scene,
        vertical ? lane + offset : along,
        vertical ? along : lane - offset,
        vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
        CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
        BODY_ROTATION[i % 3]);
      car.trafficDir = dir;
      car.vertical = vertical;
      car.cruise = 9 + rand() * 6;
      car.speed = car.cruise;
      this.cars.push(car);
    }
  }

  update(dt) {
    for (const car of this.cars) {
      if (car.dead || car.occupied) continue;
      // Follow distance: match the speed of whatever is just ahead.
      let targetSpeed = car.cruise;
      for (const other of this.cars) {
        if (other === car) continue;
        const dx = other.x - car.x, dz = other.z - car.z;
        const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 9 && side < 2.4) targetSpeed = Math.min(targetSpeed, other.speed);
      }
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2.5);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      // Turn at the city edge, at the beach, or on a whim at an intersection.
      const crossCoord = car.vertical ? car.z : car.x;
      const nearCrossing = Math.abs(crossCoord - roadCentre(crossCoord)) < 1.2;
      const outOfRoad = Math.abs(car.x) > CITY_HALF - 14 || Math.abs(car.z) > CITY_HALF - 14 || car.z > 160;
      if ((nearCrossing && this.rand() < 0.006) || outOfRoad) this.turn(car);
      car.syncMesh(dt);
    }
  }

  /** Swing onto the crossing road, keeping right-hand traffic. */
  turn(car) {
    const dir = this.rand() < 0.5 ? 1 : -1;
    if (car.vertical) {
      const z = roadCentre(car.z);
      car.vertical = false;
      car.trafficDir = dir;
      car.x = roadCentre(car.x);
      car.z = z + 3 * dir;
      car.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const x = roadCentre(car.x);
      car.vertical = true;
      car.trafficDir = dir;
      car.x = x + 3 * dir;
      car.z = roadCentre(car.z);
      car.heading = dir > 0 ? 0 : Math.PI;
    }
    // A turn that lands outside the bay folds the car back into the grid.
    if (Math.abs(car.x) > CITY_HALF - 12 || Math.abs(car.z) > CITY_HALF - 12 || car.z > 158) {
      car.x *= -0.85;
      car.z = Math.min(car.z, 150) * -0.6;
      car.heading += Math.PI;
    }
  }
}
