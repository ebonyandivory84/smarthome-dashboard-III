import { useEffect, useRef, useState, useCallback } from 'react';
import { statePush, api } from '../services/iobroker';
import type { IoBrokerState } from '../types/dashboard';

export type States = Record<string, IoBrokerState>;

export function useIoBrokerStates(stateIds: string[]): States {
  const [states, setStates] = useState<States>({});
  const idsRef = useRef<string[]>([]);

  const listener = useCallback((id: string, state: IoBrokerState) => {
    setStates(prev => ({ ...prev, [id]: state }));
  }, []);

  useEffect(() => {
    if (stateIds.length === 0) return;

    const ids = stateIds.filter(Boolean);
    idsRef.current = ids;

    // subscribe push
    statePush.subscribe(ids, listener);

    // initial fetch
    Promise.all(ids.map(id => api.getState(id).then(s => ({ id, s })).catch(() => null)))
      .then(results => {
        const initial: States = {};
        for (const r of results) {
          if (r) initial[r.id] = r.s;
        }
        setStates(prev => ({ ...initial, ...prev }));
      });

    return () => { statePush.unsubscribe(ids, listener); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateIds.join(',')]);

  return states;
}

export function useIoBrokerState(stateId: string | undefined): IoBrokerState | undefined {
  const ids = stateId ? [stateId] : [];
  const states = useIoBrokerStates(ids);
  return stateId ? states[stateId] : undefined;
}
