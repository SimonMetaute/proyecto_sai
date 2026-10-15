import express from 'express';
import { initDb } from './infrastructure/database/init-db.js';
import { initMongo } from './infrastructure/database/mongo-connection.js';
import { MySQLUserRepository } from './infrastructure/repositories/MySQLUserRepository.js';
import { MySQLProductRepository } from './infrastructure/repositories/MySQLProductRepository.js';
import { CreateUserUseCase } from './application/use-cases/CreateUserUseCase.js';
import { CreateProductUseCase } from './application/use-cases/CreateProductUseCase.js';
import { LoginUseCase } from './application/use-cases/LoginUseCase.js';
import { UserController } from './infrastructure/http/controllers/UserController.js';
import { ProductController } from './infrastructure/http/controllers/ProductController.js';
import { AuthController } from './infrastructure/http/controllers/AuthController.js';

const app = express();

app.use(express.json());

const userRepository = new MySQLUserRepository();
const productRepository = new MySQLProductRepository();

const createUserUseCase = new CreateUserUseCase(userRepository);
const createProductUseCase = new CreateProductUseCase(productRepository);
const loginUseCase = new LoginUseCase(userRepository);

const userController = new UserController(createUserUseCase);
const productController = new ProductController(createProductUseCase);
const authController = new AuthController(loginUseCase);

app.post('/api/v1/users', userController.createUser.bind(userController));
app.post('/api/v1/products', productController.createProduct.bind(productController));
app.post('/api/v1/auth/login', authController.login.bind(authController));

const PORT = 3000;

await initDb();
await initMongo();

app.listen(PORT, () => {
  console.log('NexusMarket is running on port 3000');
});
