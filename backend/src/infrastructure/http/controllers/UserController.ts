import type { Request, Response } from 'express';
import type { CreateUserUseCase } from '../../../application/use-cases/CreateUserUseCase.js';
import { EmailAlreadyExistsError } from '../../../application/use-cases/CreateUserUseCase.js';

export class UserController {
  private readonly createUserUseCase: CreateUserUseCase;

  constructor(createUserUseCase: CreateUserUseCase) {
    this.createUserUseCase = createUserUseCase;
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.createUserUseCase.execute(req.body);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Bad Request' });
      }
    }
  }
}
