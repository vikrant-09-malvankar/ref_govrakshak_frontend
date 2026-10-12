/**
 * Buyer-scoped asset / warranty / unallocated-asset rules (same rule as Super Admin Reports).
 */
import type { Asset, PurchaseOrder } from '../types';
import { getPublicOrderStatus } from './orderWorkflow';

export type JsonRecord = Record<string, unknown>;

/** Days after delivery reference with no end-user assignment → counts as unallocated (formerly "ghost"). */
export const GHOST_ASSET_LOOKBACK_DAYS = 90;

function parseJsonField<T extends JsonRecord>(v: unknown): T {
  if (!v) return {} as T;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return {} as T;
    }
  }
  if (typeof v === 'object') return v as T;
  return {} as T;
}

export function hasEndUserAssigned(asset: Asset): boolean {
  if (asset.endUserId != null && String(asset.endUserId).trim() !== '') return true;
  if (asset.endUserName && String(asset.endUserName).trim() !== '') return true;
  if (asset.endUserEmail && String(asset.endUserEmail).trim() !== '') return true;
  return false;
}

export function getLatestBatchDeliveredAt(so: JsonRecord): Date | null {
  const delivery = parseJsonField<{ batches?: Array<{ deliveredAt?: unknown }> }>(
    so['deliveryInformation'] ?? so['delivery_information']
  );
  const batches = Array.isArray(delivery.batches) ? delivery.batches : [];
  let latest: Date | null = null;
  for (const b of batches) {
    const at = b?.deliveredAt;
    if (at == null || at === '') continue;
    const d = new Date(String(at));
    if (Number.isNaN(d.getTime())) continue;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  return latest;
}

/** Same reference date rule as Super Admin ghost-asset report. */
export function getGhostAssetDeliveryMeta(
  asset: Asset,
  orderById: Map<string, JsonRecord>
): { at: Date; sourceLabel: string } | null {
  const sidRaw =
    (asset as { sellerOrderId?: unknown; seller_order_id?: unknown }).sellerOrderId ??
    (asset as { seller_order_id?: unknown }).seller_order_id;
  if (sidRaw != null && String(sidRaw).trim() !== '') {
    const so = orderById.get(String(sidRaw));
    if (so) {
      const batchAt = getLatestBatchDeliveredAt(so);
      if (batchAt) return { at: batchAt, sourceLabel: 'Batch delivery (latest)' };
    }
  }
  if (asset.actualDeliveryDate) {
    const d = new Date(asset.actualDeliveryDate);
    if (!Number.isNaN(d.getTime())) return { at: d, sourceLabel: 'Recorded delivery date' };
  }
  if (asset.allocationDate) {
    const d = new Date(asset.allocationDate);
    if (!Number.isNaN(d.getTime())) return { at: d, sourceLabel: 'Allocation date' };
  }
  return null;
}

export function computeGhostAssetRows(
  assets: Asset[],
  orderById: Map<string, JsonRecord>
): { asset: Asset; deliveryAt: Date; sourceLabel: string }[] {
  const threshold = new Date();
  threshold.setTime(threshold.getTime() - GHOST_ASSET_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const rows: { asset: Asset; deliveryAt: Date; sourceLabel: string }[] = [];
  for (const a of assets) {
    if (hasEndUserAssigned(a)) continue;
    const meta = getGhostAssetDeliveryMeta(a, orderById);
    if (!meta) continue;
    if (meta.at.getTime() > threshold.getTime()) continue;
    rows.push({ asset: a, deliveryAt: meta.at, sourceLabel: meta.sourceLabel });
  }
  rows.sort((x, y) => x.deliveryAt.getTime() - y.deliveryAt.getTime());
  return rows;
}

export function buildOrderMapFromBuyerPurchaseOrders(purchaseOrders: PurchaseOrder[]): Map<string, JsonRecord> {
  const m = new Map<string, JsonRecord>();
  for (const po of purchaseOrders) {
    m.set(String(po.id), po as unknown as JsonRecord);
  }
  return m;
}

/** Map seller order id → row (for batch deliveredAt on unallocated-asset rule). */
export function buildOrderMapFromSellerOrders(
  sellerOrders: Array<JsonRecord & { id?: unknown }>
): Map<string, JsonRecord> {
  const m = new Map<string, JsonRecord>();
  for (const so of sellerOrders) {
    if (so?.id != null) m.set(String(so.id), so);
  }
  return m;
}

export function isWarrantyExpiringWithin30Days(asset: Asset): boolean {
  if (!asset.warrantyExpiry) return false;
  const expiryDate = new Date(asset.warrantyExpiry);
  if (Number.isNaN(expiryDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
}

export function isWarrantyExpired(asset: Asset): boolean {
  if (!asset.warrantyExpiry) return false;
  const expiryDate = new Date(asset.warrantyExpiry);
  if (Number.isNaN(expiryDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiryDate < today;
}

export function getBatchDeliveryCounts(po: PurchaseOrder): { delivered: number; total: number } {
  const batches = po.deliveryInformation?.batches ?? [];
  const total = batches.length;
  const delivered = batches.filter((b) => String(b?.status || '') === 'Delivered').length;
  return { delivered, total };
}

export function getLastBatchDeliveredAt(po: PurchaseOrder): string | null {
  const batches = po.deliveryInformation?.batches ?? [];
  let latest: Date | null = null;
  for (const b of batches) {
    const at = b?.deliveredAt;
    if (at == null || at === '') continue;
    const d = new Date(String(at));
    if (Number.isNaN(d.getTime())) continue;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  return latest ? latest.toISOString() : null;
}

/** Accounts payment release: completed workflow, or delivered + all batches + buyer confirmation. */
export function getPaymentReleaseReadiness(po: PurchaseOrder): {
  ready: boolean;
  label: string;
  detail: string;
} {
  const pub = getPublicOrderStatus(po);
  if (pub === 'Completed') {
    return { ready: true, label: 'Release approved', detail: 'Order marked completed.' };
  }
  const { delivered, total } = getBatchDeliveryCounts(po);
  const buyerConfirmed = Boolean(po.deliveryInformation?.buyerConfirmed);
  const allBatchesDelivered = total > 0 && delivered === total;
  if (pub === 'Delivered' && allBatchesDelivered && buyerConfirmed) {
    return {
      ready: true,
      label: 'Release approved',
      detail: 'Delivered, all batches complete, buyer confirmed receipt.',
    };
  }
  const gaps: string[] = [];
  if (pub !== 'Delivered' && pub !== 'Completed') gaps.push(`Order status: ${pub}`);
  if (total === 0) gaps.push('No delivery batches on record');
  else if (!allBatchesDelivered) gaps.push(`Batches delivered ${delivered}/${total}`);
  if (!buyerConfirmed) gaps.push('Buyer confirmation pending');
  return {
    ready: false,
    label: 'Hold',
    detail: gaps.length ? gaps.join(' · ') : 'Not ready for payment release',
  };
}
