/**
 * Domain Entity: User (Aggregate Root)
 * Source: SDD/Domain/Domain_model.md — Section 2.1 "User" and 6.7 "Aggregates".
 *
 * DDD purity rules applied:
 *  - No imports of external libraries, frameworks, or infrastructure elements.
 *  - Only TypeScript language built-ins are used (the `Date` type is a native
 *    JS/TS built-in, not an external library).
 *
 *  Type mappings (the SDD has no TS-native equivalent without external libs):
 *    UUID     -> string
 *    DateTime -> Date
 */

/**
 * Attribute: userType (Enum).
 * The SDD states it "Can be Buyer, Seller, or Administrator".
 * Values are taken strictly from the SDD; no extra values are invented.
 */
export enum UserType {
  Buyer = 'Buyer',
  Seller = 'Seller',
  Administrator = 'Administrator',
}

/**
 * Attribute: status (UserStatus).
 * The SDD defines this attribute as an Enum ("User status within the system")
 * but does NOT enumerate its possible values. To avoid inventing information,
 * it is typed as `string` and should be constrained once the SDD specifies the
 * allowed states.
 */
export type UserStatus = string;

/**
 * Value Object: IdentityDocument.
 * Type referenced by the SDD as "IdentityDocument" ("Document type and number").
 * Kept pure: it only validates local invariants (presence of type and number).
 */
export class IdentityDocument {
  private readonly _type: string;
  private readonly _number: string;

  constructor(type: string, number: string) {
    if (!type || type.trim().length === 0) {
      throw new Error('IdentityDocument.type is required.');
    }
    if (!number || number.trim().length === 0) {
      throw new Error('IdentityDocument.number is required.');
    }
    this._type = type.trim();
    this._number = number.trim();
  }

  get type(): string {
    return this._type;
  }

  get number(): string {
    return this._number;
  }
}

/**
 * Aggregate Root: User.
 *
 * Attributes (strictly from SDD Section 2.1):
 *  userId (UUID), userType (Enum), firstName (String), lastName (String),
 *  email (String), phone (String), identityDocument (IdentityDocument),
 *  registrationDate (DateTime), status (UserStatus), updateDate (DateTime).
 *
 * Business rules (SDD) and how each is handled here (keeping the model pure):
 *  - "Email must be unique in the system." -> requires a repository/query
 *      (infrastructure); enforced at the application layer, NOT in the entity.
 *  - "Identity document must be valid and verifiable." -> local validity is
 *      enforced via IdentityDocument; external verification is an
 *      infrastructure/domain-service concern, intentionally excluded here.
 *  - "A user cannot have more than one active primary role simultaneously."
 *      -> structurally guaranteed: the entity holds a single `userType`, so a
 *      User instance can never carry more than one role.
 *  - "Status changes must be recorded in audit logs." -> cross-cutting
 *      (audit/infrastructure) concern, handled outside the entity.
 */
export class User {
  private readonly _userId: string;
  private readonly _userType: UserType;
  private readonly _firstName: string;
  private readonly _lastName: string;
  private readonly _email: string;
  private readonly _password: string;
  private readonly _phone: string;
  private readonly _identityDocument: IdentityDocument;
  private readonly _registrationDate: Date;
  private readonly _status: UserStatus;
  private readonly _updateDate: Date;

  constructor(params: {
    userId: string;
    userType: UserType;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    identityDocument: IdentityDocument;
    registrationDate: Date;
    status: UserStatus;
    updateDate: Date;
  }) {
    // Local, pure invariants only (no external dependencies).
    if (!params.userId || params.userId.trim().length === 0) {
      throw new Error('User.userId is required.');
    }
    if (!params.firstName || params.firstName.trim().length === 0) {
      throw new Error('User.firstName is required.');
    }
    if (!params.lastName || params.lastName.trim().length === 0) {
      throw new Error('User.lastName is required.');
    }
    if (!params.email || params.email.trim().length === 0) {
      throw new Error('User.email is required.');
    }
    if (!params.password || params.password.trim().length === 0) {
      throw new Error('User.password is required.');
    }
    if (!(params.identityDocument instanceof IdentityDocument)) {
      throw new Error('User.identityDocument must be a valid IdentityDocument.');
    }

    this._userId = params.userId.trim();
    this._userType = params.userType;
    this._firstName = params.firstName.trim();
    this._lastName = params.lastName.trim();
    this._email = params.email.trim();
    this._password = params.password;
    this._phone = params.phone;
    this._identityDocument = params.identityDocument;
    this._registrationDate = params.registrationDate;
    this._status = params.status;
    this._updateDate = params.updateDate;
  }

  get userId(): string {
    return this._userId;
  }

  get userType(): UserType {
    return this._userType;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get email(): string {
    return this._email;
  }

  get password(): string {
    return this._password;
  }

  get phone(): string {
    return this._phone;
  }

  get identityDocument(): IdentityDocument {
    return this._identityDocument;
  }

  get registrationDate(): Date {
    return this._registrationDate;
  }

  get status(): UserStatus {
    return this._status;
  }

  get updateDate(): Date {
    return this._updateDate;
  }
}
