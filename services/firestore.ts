import { auth } from './firebase';

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  GET = 'GET',
  WRITE = 'WRITE',
}

export function handleFirestoreError(error: unknown, operation: OperationType, path: string): never {
  const err = error as { code?: string; message?: string };
  console.error(
    JSON.stringify({
      scope: 'firestore',
      operation,
      path,
      code: err?.code,
      message: err?.message,
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
    })
  );
  throw error;
}
