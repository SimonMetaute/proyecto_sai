/**
 * Outbound Port: ProductRepository.
 * Source: SDD/Domain/Domain_model.md — Section 2.6 "Product".
 *
 * DDD purity rules applied:
 *  - This is an abstraction (a port) owned by the domain. It declares WHAT
 *    persistence operations the domain needs, never HOW they are implemented.
 *  - No imports of databases, ORMs, drivers, or any infrastructure element.
 *  - Only TypeScript language built-ins and the domain entity `Product` are used.
 *  - `import type` is used because `Product` is needed only as a type here
 *    (required by `verbatimModuleSyntax`).
 */
import type { Product } from '../../model/product.js';

/**
 * Persistence contract for the `Product` aggregate.
 *
 * The concrete implementation lives in the infrastructure layer (adapters).
 * The domain depends on this interface, not on the implementation
 * (Dependency Inversion).
 */
export interface ProductRepository {
  /**
   * Persists a product (insert or update).
   */
  save(product: Product): Promise<void>;

  /**
   * Finds a product by its unique identifier.
   * @returns the Product if it exists, otherwise null.
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Finds a product by its SKU (used to enforce the "SKU must be globally
   * unique" business rule).
   * @returns the Product if it exists, otherwise null.
   */
  findBySku(sku: string): Promise<Product | null>;
}
