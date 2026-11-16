"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPopulatedSubdoc = exports.refToIdString = void 0;
const mongoose_1 = require("mongoose");
/** Turn an ObjectId, ref string, or populated subdocument into a hex id string. */
const refToIdString = (ref) => {
    if (ref == null)
        return '';
    if (ref instanceof mongoose_1.Types.ObjectId)
        return ref.toString();
    if (typeof ref === 'string')
        return ref;
    if (typeof ref !== 'object')
        return String(ref);
    const doc = ref;
    if (doc._id != null)
        return (0, exports.refToIdString)(doc._id);
    if (typeof doc.id === 'string' && doc.id.length > 0)
        return doc.id;
    return String(ref);
};
exports.refToIdString = refToIdString;
const isPopulatedSubdoc = (ref) => typeof ref === 'object' &&
    ref !== null &&
    !(ref instanceof mongoose_1.Types.ObjectId) &&
    (('_id' in ref && ref._id != null) ||
        (typeof ref.id === 'string') ||
        'orderNumber' in ref);
exports.isPopulatedSubdoc = isPopulatedSubdoc;
