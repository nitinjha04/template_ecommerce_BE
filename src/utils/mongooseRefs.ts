import { Types } from 'mongoose';

/** Turn an ObjectId, ref string, or populated subdocument into a hex id string. */
export const refToIdString = (ref: unknown): string => {
  if (ref == null) return '';
  if (ref instanceof Types.ObjectId) return ref.toString();
  if (typeof ref === 'string') return ref;
  if (typeof ref !== 'object') return String(ref);

  const doc = ref as Record<string, unknown>;
  if (doc._id != null) return refToIdString(doc._id);
  if (typeof doc.id === 'string' && doc.id.length > 0) return doc.id;

  return String(ref);
};

export const isPopulatedSubdoc = (ref: unknown): ref is Record<string, unknown> =>
  typeof ref === 'object' &&
  ref !== null &&
  !(ref instanceof Types.ObjectId) &&
  (('_id' in ref && ref._id != null) ||
    (typeof (ref as { id?: string }).id === 'string') ||
    'orderNumber' in ref);
