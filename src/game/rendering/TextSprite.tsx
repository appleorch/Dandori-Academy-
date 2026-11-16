import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, type Sprite } from 'three';
import { useOverlayLayer } from './overlay';

/** Canvas size: twice the old resolution, so labels stay sharp on high-density screens. */
const WIDTH = 256;
const HEIGHT = 128;

interface TextSpriteProps {
  /** Called every frame; the canvas is redrawn only when the returned text changes. */
  getText: () => string;
  y: number;
  /** Fill colour of the text. */
  color?: string;
}

/** Camera-facing text label drawn to a canvas texture, rendered after post-processing. */
export function TextSprite({ getText, y, color = '#fff6dc' }: TextSpriteProps) {
  const sprite = useRef<Sprite>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const created = new CanvasTexture(canvas);
    created.colorSpace = SRGBColorSpace;
    created.minFilter = LinearFilter;
    created.generateMipmaps = false;
    return created;
  }, []);
  const drawn = useRef('');
  useOverlayLayer(sprite);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const text = getText();
    if (text === drawn.current) return;
    drawn.current = text;
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    // Long labels shrink to fit the canvas.
    context.font = `bold ${text.length > 5 ? 48 : 80}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = 16;
    context.strokeStyle = '#1c1410';
    context.strokeText(text, WIDTH / 2, HEIGHT / 2);
    context.fillStyle = color;
    context.fillText(text, WIDTH / 2, HEIGHT / 2);
    texture.needsUpdate = true;
  });

  return (
    <sprite ref={sprite} position={[0, y, 0]} scale={[2, 1, 1]}>
      <spriteMaterial
        map={texture}
        depthTest={false}
        depthWrite={false}
        transparent
        toneMapped={false}
        fog={false}
      />
    </sprite>
  );
}
