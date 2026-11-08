declare module '*/harness.mjs' {
  export const A: string;
  export const B: string;
  export function freshDb(): Promise<any>;
  export function asUser<T>(db: any, uid: string, fn: (db: any) => Promise<T>): Promise<T>;
}
