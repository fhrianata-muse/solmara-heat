// traffic.js — AI traffic: civilian cars that cruise the road grid, keep to a
// lane, slow for the car ahead, and pick a new direction at intersections.

import { Car, CAR_COLORS } from './vehicles.js';
import { CITY_HALF, ROAD_SPACING, roadCentre } from './city.js';

const LANES = [];
for (let v = -CITY_HALF + 22; v <= CITY_HALF - 10; v += ROAD_SPACING) LANES.push(v);

export class Traffic {
  constructor(scene, rand, count = 15) {
    this.cars = [];
    this.rand = rand;
    for (let i = 0; i < count; i++) {
      const vertical = rand() < 0.5;
      const lane = LANES[Math.floor(rand() * LANES.length)];
      const along = -CITY_HALF + rand() * (CITY_HALF * 2 - 30);
      const dir = rand() < 0.5 ? 1 : -1;
      const offset = 3 * dir * (vertical ? 1 : -1);
      const car = new Car(scene,
        vertical ? lane + offset : along,
        vertical ? along : lane - offset,
        vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
        CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)]);
      car.trafficDir = dir; car.vertical = vertical; car.cruise = 9 + rand() * 6;
      car.speed = car.cruise;
      this.cars.push(car);
    }
  }
  update(dt) {
    for (const car of this.cars) {
      if (car.dead || car.occupied) continue;
      // Slow down if another traffic car is close ahead.
      let target = car.cruise;
      for (const other of this.cars) {
        if (other === car) continue;
        const dx = other.x - car.x, dz = other.z - car.z;
        const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 9 && side < 2.4) target = Math.min(target, other.speed);
      }
      car.speed += (target - car.speed) * Math.min(1, dt * 2.5);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      // At the city edge or a random intersection, turn onto a crossing road.
      const nearCentre = Math.abs(car.vertical ? car.z - roadCentre(car.z) : car.x - roadCentre(car.x)) < 1.2;
      const out = Math.abs(car.x) > CITY_HALF - 14 || Math.abs(car.z) > CITY_HALF - 14 || car.z > 160;
      if ((nearCentre && this.rand() < 0.006) || out) this.turn(car);
      car.syncMesh(dt);
    }
  }
  turn(car) {
    if (car.vertical) {
      const z = roadCentre(car.z);
      const dir = this.rand() < 0.5 ? 1 : -1;
      car.vertical = false; car.trafficDir = dir;
      car.x = roadCentre(car.x) + (Math.abs(car.x - roadCentre(car.x)) > 3 ? 0 : 0);
      car.z = z - 3 * dir * -1;
      car.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const x = roadCentre(car.x);
      const dir = this.rand() < 0.5 ? 1 : -1;
      car.vertical = true; car.trafficDir = dir;
      car.x = x + 3 * dir;
      car.z = roadCentre(car.z);
      car.heading = dir > 0 ? 0 : Math.PI;
    }
    if (Math.abs(car.x) > CITY_HALF - 12 || Math.abs(car.z) > CITY_HALF - 12 || car.z > 158) {
      car.x *= -0.85; car.z = Math.min(car.z, 150) * -0.6;
      car.heading += Math.PI;
    }
  }
}
