import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  LinearFilter,
  SRGBColorSpace,
  type Group,
  type Sprite,
  type SpriteMaterial,
} from 'three';
import { useOverlayLayer } from './overlay';
import { POPUP_SECONDS, type Feedback } from './feedback';

const SLOTS = 6;
const WIDTH = 768;
const HEIGHT = 192;

function draw(texture: CanvasTexture, text: string, color: string): void {
  const context = (texture.image as HTMLCanvasElement).getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.font = 'bold 112px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 20;
  context.strokeStyle = '#1c1410';
  context.strokeText(text, WIDTH / 2, HEIGHT / 2);
  context.fillStyle = color;
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
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        texture.minFilter = LinearFilter;
        texture.generateMipmaps = false;
        return texture;
      }),
    [],
  );
  const sprites = useRef<(Sprite | null)[]>([]);
  const drawn = useRef<string[]>([]);
  const group = useRef<Group>(null);
  useOverlayLayer(group);

  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);

  useFrame(() => {
    for (let i = 0; i < SLOTS; i++) {
      const sprite = sprites.current[i];
      if (!sprite) continue;
      const popup = fx.popups[i];
      sprite.visible = popup !== undefined;
      if (!popup) continue;
      const key = `${popup.color}${popup.text}`;
      if (drawn.current[i] !== key) {
        drawn.current[i] = key;
        draw(textures[i], popup.text, popup.color);
      }
      const progress = popup.age / POPUP_SECONDS;
      sprite.position.set(popup.x, 3 + progress * 2.5, popup.z);
      // Pops in slightly oversized, then settles.
      const pop = 1 + Math.max(0, 0.35 - progress) * 1.6;
      const size = (popup.big ? 1.45 : 1) * pop;
      sprite.scale.set(5 * size, 1.25 * size, 1);
      (sprite.material as SpriteMaterial).opacity = Math.min(1, (1 - progress) * 2.5);
    }
  });

  return (
    <group ref={group}>
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
          <spriteMaterial
            map={texture}
            depthTest={false}
            depthWrite={false}
            transparent
            toneMapped={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  );
}
