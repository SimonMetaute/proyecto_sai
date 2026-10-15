/**
 * Application Use Case: CreateProduct.
 *
 * Orchestrates the "register a new product" flow by coordinating the domain
 * (the `Product` aggregate) with an outbound port (`ProductRepository`).
 *
 * DDD / Clean Architecture rules applied:
 *  - Depends only on the `ProductRepository` INTERFACE (injected via constructor),
 *    never on a concrete database or an HTTP framework. This is Dependency
 *    Inversion: the application layer defines what it needs, the infrastructure
 *    layer provides it.
 *  - Contains NO database access, NO Express/HTTP code, and NO external
 *    libraries. Only domain entities, the port interface, and language
 *    built-ins (`crypto`, `Date`) are used.
 *  - Enforces the business rule "SKU must be globally unique."
 *    (SDD Section 2.6) at this layer, since it requires querying persistence.
 */
import type { ProductCategory, ProductStatus } from '../../domain/model/product.js';
import { Product } from '../../domain/model/product.js';
import type { ProductRepository } from '../../domain/ports/out/ProductRepository.js';

/**
 * Input data for creating a product.
 * Only business data provided by the caller; system-generated values
 * (productId, publicationDate) are produced inside the use case.
 */
export interface CreateProductParams {
  name: string;
  description: string;
  category: ProductCategory;
  sku: string;
  sellerId: string;
  basePrice: number;
  productStatus: ProductStatus;
  brand: string;
}

/**
 * Business error thrown when the SKU is already registered.
 * Belongs to the application layer so upper layers can map it to an
 * appropriate response without coupling to infrastructure.
 */
export class SkuAlreadyExistsError extends Error {
  constructor(sku: string) {
    super(`The SKU "${sku}" is already registered.`);
    this.name = 'SkuAlreadyExistsError';
  }
}

export class CreateProductUseCase {
  private readonly productRepository: ProductRepository;

  /**
   * The port is injected through the constructor. The concrete implementation
   * (e.g. an in-memory, SQL, or NoSQL adapter) is provided by the caller,
   * keeping this use case pure and testable.
   */
  constructor(productRepository: ProductRepository) {
    this.productRepository = productRepository;
  }

  /**
   * Executes the use case:
   *  1. Verifies the SKU is not already registered (business rule).
   *  2. Builds the `Product` aggregate: `productId` via `crypto.randomUUID()`
   *     and `publicationDate` with the current date.
   *  3. Persists it via the injected repository.
   *
   * @returns the created `Product` aggregate.
   * @throws SkuAlreadyExistsError if the SKU already exists.
   */
  async execute(params: CreateProductParams): Promise<Product> {
    // 1. Uniqueness check (business rule from the SDD).
    const existingProduct = await this.productRepository.findBySku(params.sku);
    if (existingProduct !== null) {
      throw new SkuAlreadyExistsError(params.sku);
    }

    // 2. Build the domain aggregate (system-generated fields use built-ins).
    const now = new Date();
    const product = new Product({
      productId: globalThis.crypto.randomUUID(),
      name: params.name,
      description: params.description,
      category: params.category,
      sku: params.sku,
      sellerId: params.sellerId,
      basePrice: params.basePrice,
      productStatus: params.productStatus,
      publicationDate: now,
      brand: params.brand,
    });

    // 3. Persist through the injected port.
    await this.productRepository.save(product);

    return product;
  }
}
