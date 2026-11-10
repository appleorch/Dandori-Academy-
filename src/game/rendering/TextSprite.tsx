import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture } from 'three';

const WIDTH = 128;
const HEIGHT = 64;

interface TextSpriteProps {
  /** Called every frame; the canvas is redrawn only when the returned text changes. */
  getText: () => string;
  y: number;
}

/** Camera-facing text label drawn to a small canvas texture. */
export function TextSprite({ getText, y }: TextSpriteProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    return new CanvasTexture(canvas);
  }, []);
  const drawn = useRef('');

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const text = getText();
    if (text === drawn.current) return;
    drawn.current = text;
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.font = 'bold 40px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 8;
    context.strokeStyle = '#1c1410';
    context.strokeText(text, WIDTH / 2, HEIGHT / 2);
    context.fillStyle = '#fff6dc';
    context.fillText(text, WIDTH / 2, HEIGHT / 2);
    texture.needsUpdate = true;
  });

  return (
    <sprite position={[0, y, 0]} scale={[2, 1, 1]}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}
