// Cámara que sigue al jugador sin salirse del mundo.
export class Camera {
  constructor(worldWidth, worldHeight) {
    this.x = 0;
    this.y = 0;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }
 
  follow(target, viewWidth, viewHeight) {
    const maxX = Math.max(0, this.worldWidth - viewWidth);
    const maxY = Math.max(0, this.worldHeight - viewHeight);
 
    this.x = Math.min(Math.max(target.x - viewWidth / 2, 0), maxX);
    this.y = Math.min(Math.max(target.y - viewHeight / 2, 0), maxY);
  }
}
 