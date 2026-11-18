export type SealedQuery = Readonly<{ capability: string; expiresAt: number; queryFingerprint: string }>;

export interface LiveQuerySealer {
  readonly url: string;
  sealOrder(orderId: string): Promise<SealedQuery>;
  sealBoard(from: Date, to: Date): Promise<SealedQuery>;
}
