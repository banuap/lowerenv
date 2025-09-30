import bcrypt from 'bcryptjs';
import { UserModel } from './models/user';
import { logger } from './config/logger';

export const seedDatabase = async () => {
  try {
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password',
      },
      {
        name: 'Developer User',
        email: 'developer@example.com',
        password: 'password',
      },
    ];

    for (const userData of users) {
      const existingUser = await UserModel.findOne({ email: userData.email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new UserModel({
          ...userData,
          password: hashedPassword,
        });
        await user.save();
        logger.info(`Demo user ${userData.email} created.`);
      }
    }
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};
