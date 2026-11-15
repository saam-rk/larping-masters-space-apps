import { useContext, useLayoutEffect } from 'react';
import { SceneLoadingContext } from './sceneLoadingContext';

/** Works inside the R3F canvas and in the DOM without creating a loading label or portal. */
export function SceneLoading() {
  const register = useContext(SceneLoadingContext);
  useLayoutEffect(register, [register]);
  return null;
}
