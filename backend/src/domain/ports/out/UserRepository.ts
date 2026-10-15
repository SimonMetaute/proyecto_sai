/**
 * Outbound Port: UserRepository.
 * Source: SDD/Domain/Domain_model.md — Section 2.1 "User".
 *
 * DDD purity rules applied:
 *  - This is an abstraction (a port) owned by the domain. It declares WHAT
 *    persistence operations the domain needs, never HOW they are implemented.
 *  - No imports of databases, ORMs, drivers, or any infrastructure element.
 *  - Only TypeScript language built-ins and the domain entity `User` are used.
 *  - `import type` is used because `User` is needed only as a type here
 *    (required by `verbatimModuleSyntax`).
 */
import type { User } from '../../model/user.js';

/**
 * Persistence contract for the `User` aggregate.
 *
 * The concrete implementation lives in the infrastructure layer (adapters).
 * The domain depends on this interface, not on the implementation
 * (Dependency Inversion).
 */
export interface UserRepository {
  /**
   * Persists a user (insert or update).
   */
  save(user: User): Promise<void>;

  /**
   * Finds a user by its unique identifier.
   * @returns the User if it exists, otherwise null.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds a user by its email (used to enforce the "email must be unique"
   * business rule and for access/login flows).
   * @returns the User if it exists, otherwise null.
   */
  findByEmail(email: string): Promise<User | null>;
}
