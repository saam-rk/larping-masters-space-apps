/**
 * Standing eye-level camera for the first-person view.
 *
 * The viewer stands still at `eye` (eye height above the terrain) and only
 * turns the head: dragging sideways looks left or right, dragging up or down
 * looks toward the sky or the ground (grab semantics: the view follows the
 * pointer). The wheel or a pinch narrows or widens the field of view, like
 * binoculars, without moving the viewer. Arrow keys and +/- do the same when
 * the canvas has focus. The zoom level is shared with the slider of the view
 * (see `zoom.ts`): the rig follows `zoom` and reports its own changes through
 * `onZoomChange`. With `follow` (playback), the gaze turns to that body's
 * azimuth and elevation whenever they change; dragging still looks around
 * until the next frame.
 */

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import type { Vector3Tuple } from './geometry';
import { MAX_FOV_DEG, MIN_FOV_DEG, ZOOM_EPSILON, fovForLevel, levelForFov } from './zoom';

/** Eye height of a person about 1.70 m tall (illustrative), meters. */
export const EYE_HEIGHT_M = 1.6;

const DEG_TO_RAD = Math.PI / 180;
const MIN_PITCH_DEG = -70;
const MAX_PITCH_DEG = 85;

interface EyeLevelRigProps {
  /** Eye position, world frame. */
  readonly eye: Vector3Tuple;
  /** Initial gaze heading, degrees clockwise from north. */
  readonly initialHeadingDeg: number;
  /** Initial gaze pitch, degrees above the horizontal. */
  readonly initialPitchDeg: number;
  /** Zoom level (0..1, see `zoom.ts`). */
  readonly zoom: number;
  /** Called when the wheel, a pinch or the keys change the zoom level. */
  readonly onZoomChange: (level: number) => void;
  /** Direction the gaze stays on (azimuth and elevation, degrees), or null. */
  readonly follow?: { readonly azimuthDeg: number; readonly elevationDeg: number } | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function EyeLevelRig({ eye, initialHeadingDeg, initialPitchDeg, zoom, onZoomChange, follow = null }: EyeLevelRigProps) {
  const get = useThree((state) => state.get);
  const [eyeX, eyeY, eyeZ] = eye;
  // Latest zoom props for the listeners, without re-registering them on every change.
  const zoomRef = useRef(zoom);
  const onZoomChangeRef = useRef(onZoomChange);
  /** Sets the field of view from outside the listeners (the slider); null until mounted. */
  const setFovRef = useRef<((fovDeg: number) => void) | null>(null);
  /** Turns the gaze from outside the listeners (the followed body); null until mounted. */
  const lookAtRef = useRef<((headingDeg: number, pitchDeg: number) => void) | null>(null);
  const followAzimuth = follow?.azimuthDeg ?? null;
  const followElevation = follow?.elevationDeg ?? null;
  const followRef = useRef<readonly [number, number] | null>(null);

  // Before the rig effect below, so a new eye already knows the followed direction.
  useEffect(() => {
    followRef.current = followAzimuth === null || followElevation === null ? null : [followAzimuth, followElevation];
  }, [followAzimuth, followElevation]);

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  useEffect(() => {
    zoomRef.current = zoom;
    setFovRef.current?.(fovForLevel(zoom));
  }, [zoom]);

  useEffect(() => {
    const { gl, invalidate } = get();
    const element = gl.domElement;
    // A new eye or heading (new result) keeps the current zoom.
    const view = {
      heading: initialHeadingDeg,
      pitch: clamp(initialPitchDeg, MIN_PITCH_DEG, MAX_PITCH_DEG),
      fov: fovForLevel(zoomRef.current),
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    const apply = () => {
      const camera = get().camera as PerspectiveCamera;
      camera.position.set(eyeX, eyeY, eyeZ);
      // Heading clockwise from north (-Z); a positive three.js yaw turns toward the west.
      camera.rotation.set(view.pitch * DEG_TO_RAD, -view.heading * DEG_TO_RAD, 0, 'YXZ');
      if (camera.fov !== view.fov) {
        camera.fov = view.fov;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld();
      invalidate();
    };

    /** Degrees per CSS pixel, so a drag moves the view about as far as the pointer. */
    const degreesPerPixel = () => view.fov / Math.max(1, element.clientHeight);

    const look = (dxPx: number, dyPx: number) => {
      const k = degreesPerPixel();
      view.heading = (((view.heading - dxPx * k) % 360) + 360) % 360;
      view.pitch = clamp(view.pitch + dyPx * k, MIN_PITCH_DEG, MAX_PITCH_DEG);
      apply();
    };

    const zoom = (factor: number) => {
      view.fov = clamp(view.fov * factor, MIN_FOV_DEG, MAX_FOV_DEG);
      apply();
      const level = levelForFov(view.fov);
      zoomRef.current = level;
      onZoomChangeRef.current(level);
    };

    lookAtRef.current = (headingDeg: number, pitchDeg: number) => {
      view.heading = ((headingDeg % 360) + 360) % 360;
      view.pitch = clamp(pitchDeg, MIN_PITCH_DEG, MAX_PITCH_DEG);
      apply();
    };
    // A new eye during playback keeps looking at the followed body.
    if (followRef.current) {
      view.heading = ((followRef.current[0] % 360) + 360) % 360;
      view.pitch = clamp(followRef.current[1], MIN_PITCH_DEG, MAX_PITCH_DEG);
    }

    setFovRef.current = (fovDeg: number) => {
      if (Math.abs(levelForFov(fovDeg) - levelForFov(view.fov)) <= ZOOM_EPSILON) return;
      view.fov = clamp(fovDeg, MIN_FOV_DEG, MAX_FOV_DEG);
      apply();
    };

    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      element.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) pinch = pinchDistance();
      element.style.cursor = 'grabbing';
    };

    const onPointerMove = (event: PointerEvent) => {
      const last = pointers.get(event.pointerId);
      if (!last) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        look(dx, dy);
      } else if (pointers.size === 2) {
        const next = pinchDistance();
        if (pinch > 0 && next > 0) zoom(pinch / next);
        pinch = next;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (pointers.size === 0) element.style.cursor = 'grab';
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(Math.exp(event.deltaY * 0.001));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const step = 40;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => look(step, 0),
        ArrowRight: () => look(-step, 0),
        ArrowUp: () => look(0, step),
        ArrowDown: () => look(0, -step),
        '+': () => zoom(0.85),
        '=': () => zoom(0.85),
        '-': () => zoom(1 / 0.85),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    };

    element.style.touchAction = 'none';
    element.style.cursor = 'grab';
    element.tabIndex = 0;
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('keydown', onKeyDown);
    apply();

    return () => {
      setFovRef.current = null;
      lookAtRef.current = null;
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('keydown', onKeyDown);
      element.style.cursor = '';
      element.style.touchAction = '';
    };
  }, [get, eyeX, eyeY, eyeZ, initialHeadingDeg, initialPitchDeg]);

  useEffect(() => {
    if (followAzimuth !== null && followElevation !== null) lookAtRef.current?.(followAzimuth, followElevation);
  }, [followAzimuth, followElevation]);

  return null;
}
