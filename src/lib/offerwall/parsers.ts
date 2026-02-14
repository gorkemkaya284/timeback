/**
 * Provider-specific parsers for offerwall postback payloads.
 * Each provider sends different field names; adapters normalize to a common shape.
 */

export type ParsedConversion = {
  userId: string;
  transactionId: string;
  rewardPoints: number;
  offerId?: string;
  rawPayload: unknown;
};

/**
 * Lootably postback format.
 * TODO: Verify actual Lootably API fields from their docs.
 * Common patterns: subid/user_id, transaction_id, payout, offer_id
 */
export function parseLootably(body: Record<string, unknown>): ParsedConversion | null {
  const userId = body.subid ?? body.user_id ?? body.userId;
  const transactionId = body.transaction_id ?? body.transactionId ?? body.oid;
  const rewardPoints = body.payout ?? body.reward_points ?? body.rewardPoints ?? body.amount;
  const offerId = body.offer_id ?? body.offerId ?? body.offerid;

  if (
    typeof userId !== 'string' ||
    typeof transactionId !== 'string' ||
    (typeof rewardPoints !== 'number' && typeof rewardPoints !== 'string')
  ) {
    return null;
  }

  const points = typeof rewardPoints === 'string' ? parseInt(rewardPoints, 10) : Math.floor(rewardPoints);
  if (isNaN(points) || points < 1) return null;

  return {
    userId: String(userId).trim(),
    transactionId: String(transactionId).trim(),
    rewardPoints: points,
    offerId: offerId != null ? String(offerId) : undefined,
    rawPayload: body,
  };
}

/**
 * AdGate postback format.
 * TODO: Verify actual AdGate API fields from their docs.
 */
export function parseAdGate(body: Record<string, unknown>): ParsedConversion | null {
  const userId = body.user_id ?? body.userId ?? body.uid;
  const transactionId = body.transaction_id ?? body.transactionId ?? body.transactionid ?? body.tid;
  const rewardPoints = body.reward_points ?? body.rewardPoints ?? body.points ?? body.payout;
  const offerId = body.offer_id ?? body.offerId ?? body.oid;

  if (
    typeof userId !== 'string' ||
    typeof transactionId !== 'string' ||
    (typeof rewardPoints !== 'number' && typeof rewardPoints !== 'string')
  ) {
    return null;
  }

  const points = typeof rewardPoints === 'string' ? parseInt(rewardPoints, 10) : Math.floor(rewardPoints);
  if (isNaN(points) || points < 1) return null;

  return {
    userId: String(userId).trim(),
    transactionId: String(transactionId).trim(),
    rewardPoints: points,
    offerId: offerId != null ? String(offerId) : undefined,
    rawPayload: body,
  };
}

/**
 * Monlix postback format.
 * TODO: Verify actual Monlix API fields from their docs.
 */
export function parseMonlix(body: Record<string, unknown>): ParsedConversion | null {
  const userId = body.user_id ?? body.userId ?? body.uid;
  const transactionId = body.transaction_id ?? body.transactionId ?? body.conversion_id;
  const rewardPoints = body.reward_points ?? body.rewardPoints ?? body.payout ?? body.amount;
  const offerId = body.offer_id ?? body.offerId ?? body.campaign_id;

  if (
    typeof userId !== 'string' ||
    typeof transactionId !== 'string' ||
    (typeof rewardPoints !== 'number' && typeof rewardPoints !== 'string')
  ) {
    return null;
  }

  const points = typeof rewardPoints === 'string' ? parseInt(rewardPoints, 10) : Math.floor(rewardPoints);
  if (isNaN(points) || points < 1) return null;

  return {
    userId: String(userId).trim(),
    transactionId: String(transactionId).trim(),
    rewardPoints: points,
    offerId: offerId != null ? String(offerId) : undefined,
    rawPayload: body,
  };
}

/**
 * Default/generic parser: expects standard field names.
 * Works when provider sends user_id, transaction_id, reward_points.
 */
export function parseDefault(body: Record<string, unknown>): ParsedConversion | null {
  const userId = body.user_id ?? body.userId;
  const transactionId = body.transaction_id ?? body.transactionId;
  const rewardPoints = body.reward_points ?? body.rewardPoints ?? body.points;
  const offerId = body.offer_id ?? body.offerId;

  if (
    typeof userId !== 'string' ||
    typeof transactionId !== 'string' ||
    (typeof rewardPoints !== 'number' && typeof rewardPoints !== 'string')
  ) {
    return null;
  }

  const points = typeof rewardPoints === 'string' ? parseInt(rewardPoints, 10) : Math.floor(rewardPoints);
  if (isNaN(points) || points < 1) return null;

  return {
    userId: String(userId).trim(),
    transactionId: String(transactionId).trim(),
    rewardPoints: points,
    offerId: offerId != null ? String(offerId) : undefined,
    rawPayload: body,
  };
}

const PARSERS: Record<string, (body: Record<string, unknown>) => ParsedConversion | null> = {
  lootably: parseLootably,
  adgate: parseAdGate,
  monlix: parseMonlix,
};

export function parseOfferwallPayload(
  provider: string,
  body: Record<string, unknown>
): ParsedConversion | null {
  const parser = PARSERS[provider.toLowerCase()] ?? parseDefault;
  return parser(body);
}
