import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, type Sprite, type SpriteMaterial } from 'three';
import { POPUP_SECONDS, type Feedback } from './feedback';

const SLOTS = 6;
const WIDTH = 384;
const HEIGHT = 96;

function draw(texture: CanvasTexture, text: string): void {
  const context = (texture.image as HTMLCanvasElement).getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.font = 'bold 56px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 10;
  context.strokeStyle = '#1c1410';
  context.strokeText(text, WIDTH / 2, HEIGHT / 2);
  context.fillStyle = '#ffd257';
  context.fillText(text, WIDTH / 2, HEIGHT / 2);
  texture.needsUpdate = true;
}

/** Score text that floats up from where it was earned and fades out. */
export function Popups({ fx }: { fx: Feedback }) {
  const textures = useMemo(
    () =>
      Array.from({ length: SLOTS }, () => {
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        return new CanvasTexture(canvas);
      }),
    [],
  );
  const sprites = useRef<(Sprite | null)[]>([]);
  const drawn = useRef<string[]>([]);

  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);

  useFrame(() => {
    for (let i = 0; i < SLOTS; i++) {
      const sprite = sprites.current[i];
      if (!sprite) continue;
      const popup = fx.popups[i];
      sprite.visible = popup !== undefined;
      if (!popup) continue;
      if (drawn.current[i] !== popup.text) {
        drawn.current[i] = popup.text;
        draw(textures[i], popup.text);
      }
      const progress = popup.age / POPUP_SECONDS;
      sprite.position.set(popup.x, 3 + progress * 2.5, popup.z);
      (sprite.material as SpriteMaterial).opacity = Math.min(1, (1 - progress) * 2.5);
    }
  });

  return (
    <>
      {textures.map((texture, i) => (
        <sprite
          key={i}
          ref={(node) => {
            sprites.current[i] = node;
          }}
          scale={[5, 1.25, 1]}
          visible={false}
          renderOrder={5}
        >
          <spriteMaterial map={texture} depthTest={false} transparent />
        </sprite>
      ))}
    </>
  );
}
