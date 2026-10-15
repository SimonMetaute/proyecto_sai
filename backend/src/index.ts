import express from 'express';
import { InMemoryUserRepository } from './infrastructure/persistence/memory/InMemoryUserRepository.js';
import { InMemoryProductRepository } from './infrastructure/persistence/memory/InMemoryProductRepository.js';
import { CreateUserUseCase } from './application/use-cases/CreateUserUseCase.js';
import { CreateProductUseCase } from './application/use-cases/CreateProductUseCase.js';
import { UserController } from './infrastructure/http/controllers/UserController.js';
import { ProductController } from './infrastructure/http/controllers/ProductController.js';

const app = express();

app.use(express.json());

const userRepository = new InMemoryUserRepository();
const productRepository = new InMemoryProductRepository();

const createUserUseCase = new CreateUserUseCase(userRepository);
const createProductUseCase = new CreateProductUseCase(productRepository);

const userController = new UserController(createUserUseCase);
const productController = new ProductController(createProductUseCase);

app.post('/api/v1/users', userController.createUser.bind(userController));
app.post('/api/v1/products', productController.createProduct.bind(productController));

const PORT = 3000;

app.listen(PORT, () => {
  console.log('NexusMarket is running on port 3000');
});
