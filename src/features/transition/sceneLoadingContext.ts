import { createContext } from 'react';

/** Register one suspended scene boundary; unregister when it resolves or unmounts. */
export const SceneLoadingContext = createContext<() => () => void>(() => () => {});
