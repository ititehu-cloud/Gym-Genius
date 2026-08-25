'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries and surfaces errors correctly.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined,
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (!isMounted.current) return;
        const results: WithId<T>[] = snapshot.docs.map(doc => ({
            ...(doc.data() as T),
            id: doc.id
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        if (!isMounted.current) return;
        console.error('❌ Firestore error:', error.code, error.message);
        
        let path: string = 'unknown';
        if (memoizedTargetRefOrQuery && 'path' in memoizedTargetRefOrQuery) {
          try {
            path = (memoizedTargetRefOrQuery as any).path;
          } catch (e) {
            // Path extraction failed
          }
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(error);
        setData(null);
        setIsLoading(false);

        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', contextualError);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
