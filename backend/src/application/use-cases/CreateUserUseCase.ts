/**
 * Application Use Case: CreateUser.
 *
 * Orchestrates the "register a new user" flow by coordinating the domain
 * (the `User` aggregate) with an outbound port (`UserRepository`).
 *
 * DDD / Clean Architecture rules applied:
 *  - Depends only on the `UserRepository` INTERFACE (injected via constructor),
 *    never on a concrete database or an HTTP framework. This is Dependency
 *    Inversion: the application layer defines what it needs, the infrastructure
 *    layer provides it.
 *  - Contains NO database access, NO Express/HTTP code, and NO external
 *    libraries. Only domain entities, the port interface, and language
 *    built-ins (`crypto`, `Date`) are used.
 *  - Enforces the business rule "Email must be unique in the system."
 *    (SDD Section 2.1) at this layer, since it requires querying persistence.
 */
import { User, IdentityDocument, UserType } from '../../domain/model/user.js';
import type { UserRepository } from '../../domain/ports/out/UserRepository.js';

/**
 * Input data for creating a user.
 * Only business data provided by the caller; system-generated values
 * (userId, registrationDate, updateDate) are produced inside the use case.
 */
export interface CreateUserParams {
  userType: UserType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  status?: string;
}

/**
 * Business error thrown when the email is already registered.
 * Belongs to the application layer so upper layers can map it to an
 * appropriate response without coupling to infrastructure.
 */
export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists.`);
    this.name = 'EmailAlreadyExistsError';
  }
}

export class CreateUserUseCase {
  private readonly userRepository: UserRepository;

  /**
   * The port is injected through the constructor. The concrete implementation
   * (e.g. an in-memory, SQL, or NoSQL adapter) is provided by the caller,
   * keeping this use case pure and testable.
   */
  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Executes the use case:
   *  1. Verifies the email is not already registered (business rule).
   *  2. Builds the `User` aggregate with its `IdentityDocument` value object.
   *  3. Persists it via the injected repository.
   *
   * @returns the created `User` aggregate.
   * @throws EmailAlreadyExistsError if the email already exists.
   */
  async execute(params: CreateUserParams): Promise<User> {
    // 1. Uniqueness check (business rule from the SDD).
    const existingUser = await this.userRepository.findByEmail(params.email);
    if (existingUser !== null) {
      throw new EmailAlreadyExistsError(params.email);
    }

    // 2. Build the domain aggregate (system-generated fields use built-ins).
    const now = new Date();
    const user = new User({
      userId: globalThis.crypto.randomUUID(),
      userType: params.userType,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      identityDocument: new IdentityDocument(
        params.identityDocumentType,
        params.identityDocumentNumber,
      ),
      registrationDate: now,
      status: params.status ?? 'Active',
      updateDate: now,
    });

    // 3. Persist through the injected port.
    await this.userRepository.save(user);

    return user;
  }
}
