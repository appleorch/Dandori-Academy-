import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { audio } from '../audio/audioManager';
import { coopDay, useGameStore } from '../core/gameStore';
import { CameraRig } from '../camera/CameraRig';
import type { InputController } from '../commands/input';
import { RESERVED_KEY } from '../commands/bindings';
import { Battle, RIVAL_NAMES } from '../modes/battle';
import { isBattle, MODES } from '../modes/modes';
import { Expedition } from '../simulation/expedition';
import { Simulation } from '../simulation/Simulation';
import { initPhysics, physicsReady } from '../simulation/physics';
import { heightAt } from '../world/heightMap';
import type { GraphicsLevel } from '../core/settings';
import type { LevelDefinition } from '../world/level';
import { AimArc } from './AimArc';
import { Architecture } from './Architecture';
import { KitMeshes } from './KitMeshes';
import { Beacons } from './Beacons';
import { Atmosphere } from './Atmosphere';
import { Weather } from './Weather';
import { CaptainMesh } from './CaptainMesh';
import { CarryableMeshes } from './CarryableMeshes';
import { CursorFx } from './CursorFx';
import { EnemyMeshes } from './EnemyMeshes';
import { Feedback } from './feedback';
import { GameLoop } from './GameLoop';
import { HazardMeshes } from './HazardMeshes';
import { Minimap } from './Minimap';
import { SafeRings } from './SafeRings';
import { PhotoCamera, PhotoShot } from './PhotoMode';
import { ParticleField } from './ParticleField';
import { OverlayInMainPass } from './OverlayInMainPass';
import { PostFx } from './PostFx';
import { Popups } from './Popups';
import { Scenery } from './Scenery';
import { SkyLight } from './SkyLight';
import { Terrain } from './Terrain';
import { WaterAndBridges } from './WaterAndBridges';
import { Butterflies } from './Butterflies';
import { Dewdrops } from './Dewdrops';
import { Fallen } from './Fallen';
import { Conveyors } from './Conveyors';
import { Telescope } from './Telescope';
import { GhostWarden } from './GhostWarden';
import { OtherWarden } from './OtherWarden';
import { WorkerInstances } from './WorkerInstances';
import { PerfProbe, ShadowBudget } from './perf';
import { QualityTuner } from './QualityTuner';
import { t } from '../../i18n/i18n';
import { campaignAbilities, caveField, type CampaignState } from '../campaign/campaign';
import { decodeFog } from '../campaign/fog';

/** The story's day: the Clock's gifts so far, and what has been seen of the section already. */
function storyOptions(state: CampaignState, level: LevelDefinition) {
  return {
    abilities: campaignAbilities(state),
    explored: decodeFog(state.seen, level),
    items: state.items,
  };
}
import { PerfOverlay } from '../../ui/PerfOverlay';

/**
 * Owns one day's simulation and renders it. Remount (change `key`) to start a new day.
 * Changing the graphics level rebuilds the 3D scene but keeps the simulation.
 */
interface Quality {
  shadows: boolean;
  shadowMapSize: number;
  postFx: boolean;
  ambientOcclusion: boolean;
  dpr: [number, number];
}

const QUALITY: Record<GraphicsLevel, Quality> = {
  low: { shadows: false, shadowMapSize: 512, postFx: false, ambientOcclusion: false, dpr: [1, 1] },
  medium: {
    shadows: true,
    shadowMapSize: 1024,
    postFx: true,
    ambientOcclusion: false,
    dpr: [1, 1.5],
  },
  high: { shadows: true, shadowMapSize: 2048, postFx: true, ambientOcclusion: true, dpr: [1, 2] },
};

/** Share of the grass, flowers and giant border drawn at each graphics level. */
const FOLIAGE_DENSITY: Record<GraphicsLevel, number> = { low: 0.45, medium: 0.75, high: 1 };

interface GameCanvasProps {
  level: LevelDefinition;
  input: InputController;
}

export function GameCanvas({ level, input }: GameCanvasProps) {
  // The day: the surface and any caves gone down into. `sim` is whichever is being played.
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [fx] = useState(() => new Feedback());
  const playing = useGameStore((state) => state.phase === 'playing' && !state.paused);
  // Rapier loads on demand; the field is drawn meanwhile and the day starts once it is ready.
  const [ready, setReady] = useState(physicsReady);
  useEffect(() => {
    if (ready) return;
    let live = true;
    void initPhysics().then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, [ready]);

  const graphics = useGameStore((state) => state.settings.graphics);
  const quality = QUALITY[graphics];
  const zoomSpeed = useGameStore((state) => state.settings.zoomSpeed);
  const pauseOnBlur = useGameStore((state) => state.settings.pauseOnBlur);
  const tiltShift = useGameStore((state) => state.settings.tiltShift);
  const bindings = useGameStore((state) => state.settings.bindings);
  const whistleToggle = useGameStore((state) => state.settings.whistleToggle);
  const fastToggle = useGameStore((state) => state.settings.fastToggle);
  const aimAssist = useGameStore((state) => state.settings.aimAssist);
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);
  const photo = useGameStore((state) => state.photo !== null);

  useEffect(() => {
    if (!ready) return;
    // The mode and rival are fixed when the day starts; the scene is rebuilt for every new day.
    const { playMode, rival, coop, online } = useGameStore.getState();
    const rules = MODES[playMode];
    const created = new Expedition(
      new Simulation(level, {
        endsWhen: rules.endsWhen,
        growth: rules.growth,
        story: playMode === 'campaign',
        coop: coopDay(coop, playMode),
        ...(playMode === 'campaign'
          ? storyOptions(useGameStore.getState().save.campaign, level)
          : {}),
      }),
    );
    if (playMode === 'campaign') {
      const state = useGameStore.getState().save.campaign;
      created.caveFilter = (spec) => caveField(state, spec);
    }
    const race = isBattle(playMode)
      ? new Battle(playMode, level, rival, online ? { host: online.host } : null)
      : null;
    setExpedition(created);
    setSim(created.active);
    setBattle(race);
    // Development builds only: lets browser checks reach the running day.
    if (import.meta.env.DEV) {
      (window as unknown as { __dandori?: unknown }).__dandori = { expedition: created, setSim };
    }
    return () => {
      created.dispose();
      race?.dispose();
    };
  }, [level, ready]);

  // Effects sit on raised ground of whichever place is being played.
  useEffect(() => {
    const ground = sim?.level ?? level;
    fx.ground = (x, z) => heightAt(ground, x, z);
  }, [sim, level, fx]);

  useEffect(() => {
    input.zoomSpeed = zoomSpeed;
    input.bindings = bindings;
    input.whistleToggle = whistleToggle;
    input.fastToggle = fastToggle;
    input.aimAssist = aimAssist;
  }, [input, zoomSpeed, bindings, whistleToggle, fastToggle, aimAssist]);

  useEffect(() => {
    fx.calm = reducedMotion;
  }, [fx, reducedMotion]);

  // The whistle never outlives the day it was blown in.
  useEffect(() => {
    if (!playing) audio.setWhistle(false);
  }, [playing]);

  // The pause key (and Escape, always) toggles the pause menu.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const store = useGameStore.getState();
      if (store.pokerOpen || event.repeat) return;
      const keys = store.settings.bindings.keys;
      if (event.code === 'Enter' && store.briefing) store.beginDay();
      // Restart works from the pause menu or the results, never mid-play by accident. A story
      // day cannot be taken back: from its results it goes on to the next day, mid-day not at all.
      const story = store.playMode === 'campaign';
      if (
        keys.restart.includes(event.code) &&
        // An online battle cannot be restarted from one side alone.
        !store.online &&
        (store.phase === 'results' ||
          (store.paused && !story) ||
          // Time Attack restarts at once, mid-day too.
          (store.playMode === 'lessons' && store.phase === 'playing' && !store.briefing))
      ) {
        store.startDay(store.levelId);
        return;
      }
      const pauseKey = event.code === RESERVED_KEY || keys.pause.includes(event.code);
      // Photo mode: the pause key goes back to the pause menu.
      if (pauseKey && store.photo) {
        store.setPhoto(null);
        return;
      }
      if (!pauseKey || store.briefing) return;
      if (store.paused) store.resume();
      else store.pause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Pause when the player switches tabs or windows, if they asked for that.
  useEffect(() => {
    if (!pauseOnBlur) return;
    const pause = (): void => useGameStore.getState().pause();
    const onVisibility = (): void => {
      if (document.hidden) pause();
    };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pauseOnBlur]);

  return (
    <>
      <PerfOverlay />
      {!ready && (
        <div className="loading-kiln" role="status">
          <span className="loading-kiln-glow" aria-hidden="true" />
          {t('loading.kiln')}
        </div>
      )}
      <Canvas
        key={graphics}
        shadows={quality.shadows ? 'soft' : false}
        dpr={quality.dpr}
        gl={{
          antialias: !quality.postFx,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
        }}
        camera={{
          fov: 42,
          near: 1,
          far: 320,
          // High above the Warden, so the day opens with a swoop down to the field.
          position: [level.captain.x, 70, level.captain.z + 44],
        }}
      >
        <PerfProbe />
        <QualityTuner />
        {quality.shadows && <ShadowBudget />}
        {quality.postFx ? (
          <PostFx ambientOcclusion={quality.ambientOcclusion} tiltShift={tiltShift} />
        ) : (
          <OverlayInMainPass />
        )}
        {expedition && sim && (
          <GameLoop
            expedition={expedition}
            battle={battle}
            input={input}
            fx={fx}
            onSwitch={setSim}
          />
        )}
        {/*
        Everything that belongs to one place is rebuilt when the Warden goes down or up. The two
        groups are siblings, so their keys carry different prefixes: equal keys would make React
        mix up the two and leave the old place's ground behind.
      */}
        <group key={`world-${sim?.level.id ?? level.id}`}>
          <Terrain level={sim?.level ?? level} />
          <Architecture level={sim?.level ?? level} />
          <KitMeshes level={sim?.level ?? level} density={FOLIAGE_DENSITY[graphics]} />
          <Scenery
            level={sim?.level ?? level}
            sim={sim ?? undefined}
            density={FOLIAGE_DENSITY[graphics]}
          />
        </group>
        {sim && (
          <group key={`day-${sim.level.id}`}>
            <CameraRig sim={sim} input={input} fx={fx} />
            {photo && <PhotoCamera sim={sim} />}
            <PhotoShot />
            <SkyLight sim={sim} shadowMapSize={quality.shadowMapSize} />
            <Atmosphere sim={sim} />
            <Weather sim={sim} />
            <CaptainMesh sim={sim} />
            <WorkerInstances sim={sim} />
            <Dewdrops sim={sim} />
            <Fallen sim={sim} />
            <Conveyors sim={sim} />
            <Telescope sim={sim} />
            <GhostWarden sim={sim} />
            <OtherWarden sim={sim} />
            <Butterflies sim={sim} />
            <CarryableMeshes sim={sim} />
            <EnemyMeshes sim={sim} />
            <WaterAndBridges sim={sim} />
            <Beacons sim={sim} />
            <SafeRings sim={sim} />
            <Minimap sim={sim} mapHeld={() => input.held('map')} />
            {battle && <Minimap sim={battle.rival} rival={RIVAL_NAMES[battle.rivalLevel]} />}
            <HazardMeshes sim={sim} />
            <AimArc sim={sim} />
            <CursorFx sim={sim} />
            <ParticleField particles={fx.particles} />
            <Popups fx={fx} />
          </group>
        )}
      </Canvas>
    </>
  );
}
