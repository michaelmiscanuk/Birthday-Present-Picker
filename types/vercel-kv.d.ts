declare module '@vercel/kv' {
  export interface VercelKV {
    get<T = unknown>(key: string): Promise<T | null>;
    set(
      key: string,
      value: unknown,
      options?: Record<string, unknown>,
    ): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    hget(key: string, field: string): Promise<unknown>;
    hset(key: string, obj: Record<string, unknown>): Promise<number>;
  }

  export const kv: VercelKV;
}
