"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNBXD_FIELDS = exports.DEFAULT_PAGE_SIZE = exports.UNBXD_CATEGORY_URL = exports.UNBXD_SITE_KEY = exports.UNBXD_API_KEY = exports.MINEVIEW_STORE_SLUG = exports.MINEVIEW_STORE_NAME = exports.MINEVIEW_STORE_DOMAIN = void 0;
/** Mineview storefront — Max Fashion Unbxd source. */
exports.MINEVIEW_STORE_DOMAIN = 'mineview.vercel.app';
exports.MINEVIEW_STORE_NAME = 'Mineview';
exports.MINEVIEW_STORE_SLUG = 'mineview';
exports.UNBXD_API_KEY = 'd11649dadd583dbf85dbd5eb928160e7';
exports.UNBXD_SITE_KEY = 'ss-unbxd-aapac-prod-Max-LandMark48741709218622';
/** User-provided category endpoint (same catalog as Nexa /search). */
exports.UNBXD_CATEGORY_URL = `https://search.unbxd.io/${exports.UNBXD_API_KEY}/${exports.UNBXD_SITE_KEY}/category`;
exports.DEFAULT_PAGE_SIZE = 48;
exports.UNBXD_FIELDS = 'concept,createDate,employeePrice,isConceptDelivery,name,percentageDiscount,productType,productCode,color,sibiling,price,productUrl,childDetail,summary,uniqueId,wasPrice,imageUrl,gallaryImages,badgeVisible,inStock,approvalStatus,stats,sislogo,membershipPrice,membershipDiscount,bestPrice,membershipBestPrice,employeeBestPrice,isCustomFurniture,productNumberOfRating,productRating,isGiftCard';
