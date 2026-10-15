import type { User } from '../../../domain/model/user.js';

export class UserMapper {
  static toResponse(user: User): Record<string, unknown> {
    return {
      userId: user.userId,
      userType: user.userType,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      identityDocument: {
        type: user.identityDocument.type,
        number: user.identityDocument.number,
      },
      registrationDate: user.registrationDate,
      status: user.status,
      updateDate: user.updateDate,
    };
  }
}
