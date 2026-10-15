/**
 * Domain Entity: Product (Aggregate Root)
 * Source: SDD/Domain/Domain_model.md — Section 2.6 "Product" and 6.7 "Aggregates".
 *
 * DDD purity rules applied:
 *  - No imports of external libraries, frameworks, or infrastructure elements.
 *  - Only TypeScript language built-ins are used.
 *
 *  Type mappings (the SDD has no TS-native equivalent without external libs):
 *    UUID     -> string
 *    Decimal  -> number
 *    DateTime -> Date
 */

/**
 * Attribute: productStatus (Enum).
 * The SDD defines it as "Publication status and availability" but does NOT
 * enumerate its values. Typed as `string` to avoid inventing information; it
 * should be constrained once the SDD specifies the allowed states.
 */
export type ProductStatus = string;

/**
 * Attribute: category (ProductCategory).
 * The SDD defines it as "Product group or category" but does NOT enumerate its
 * values. Typed as `string` to avoid inventing information; it should be
 * constrained once the SDD specifies the allowed categories.
 */
export type ProductCategory = string;

/**
 * Aggregate Root: Product.
 *
 * Attributes (strictly from SDD Section 2.6):
 *  productId (UUID), name (String), description (String),
 *  category (ProductCategory), sku (String), sellerId (reference to Seller),
 *  basePrice (Decimal), productStatus (ProductStatus),
 *  publicationDate (DateTime), brand (String).
 *
 * NOTE on the seller relationship:
 *  The SDD table (2.6) lists `seller | Seller`, but the aggregate boundary rule
 *  (6.7) states that "coordination with another aggregate occurs through an
 *  application service, an identifier reference, or a domain event, never
 *  through direct access to another aggregate's internal objects." Since Seller
 *  is a separate aggregate root, the reference is modeled by its identifier
 *  (`sellerId`) instead of embedding the whole Seller object.
 *
 * Business rules (SDD) and how each is handled here (keeping the model pure):
 *  - "SKU must be globally unique." -> uniqueness requires a repository/query
 *      (infrastructure); enforced at the application layer. Only the local
 *      non-empty invariant is checked here.
 *  - "A product cannot be published if the seller is not verified." -> requires
 *      verifying the Seller aggregate (outside this boundary); enforced by an
 *      application/domain service, NOT in the constructor.
 *  - "Pricing must be consistent with product type and marketplace policy."
 *      -> local invariant enforced here: basePrice must be a non-negative number.
 */
export class Product {
  private readonly _productId: string;
  private readonly _name: string;
  private readonly _description: string;
  private readonly _category: ProductCategory;
  private readonly _sku: string;
  private readonly _sellerId: string;
  private readonly _basePrice: number;
  private readonly _productStatus: ProductStatus;
  private readonly _publicationDate: Date;
  private readonly _brand: string;

  constructor(params: {
    productId: string;
    name: string;
    description: string;
    category: ProductCategory;
    sku: string;
    sellerId: string;
    basePrice: number;
    productStatus: ProductStatus;
    publicationDate: Date;
    brand: string;
  }) {
    // Local, pure invariants only (no external dependencies).
    if (!params.productId || params.productId.trim().length === 0) {
      throw new Error('Product.productId is required.');
    }
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Product.name is required.');
    }
    if (!params.sku || params.sku.trim().length === 0) {
      throw new Error('Product.sku is required.');
    }
    if (!params.sellerId || params.sellerId.trim().length === 0) {
      throw new Error('Product.sellerId is required (reference to the Seller aggregate).');
    }
    if (typeof params.basePrice !== 'number' || Number.isNaN(params.basePrice)) {
      throw new Error('Product.basePrice must be a valid number.');
    }
    if (params.basePrice < 0) {
      throw new Error('Product.basePrice cannot be negative.');
    }

    this._productId = params.productId.trim();
    this._name = params.name.trim();
    this._description = params.description;
    this._category = params.category;
    this._sku = params.sku.trim();
    this._sellerId = params.sellerId.trim();
    this._basePrice = params.basePrice;
    this._productStatus = params.productStatus;
    this._publicationDate = params.publicationDate;
    this._brand = params.brand;
  }

  get productId(): string {
    return this._productId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get category(): ProductCategory {
    return this._category;
  }

  get sku(): string {
    return this._sku;
  }

  get sellerId(): string {
    return this._sellerId;
  }

  get basePrice(): number {
    return this._basePrice;
  }

  get productStatus(): ProductStatus {
    return this._productStatus;
  }

  get publicationDate(): Date {
    return this._publicationDate;
  }

  get brand(): string {
    return this._brand;
  }
}
