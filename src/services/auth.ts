import { Service, Inject } from 'typedi';
import jwt from 'jsonwebtoken';
import config from '@/config';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';

@Service()
export default class AuthService {
  constructor(@Inject('logger') private logger, @EventDispatcher() private eventDispatcher: EventDispatcherInterface) {}

  public async SignIn(username: string, password: string): Promise<{ token: string }> {
    if (username === process.env.USERNAME && password === process.env.PASSWORD) {
      const token = this.generateToken(username);
      return { token };
    } else {
      throw new Error('Invalid Password');
    }
  }

  private generateToken(username) {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign(
      {
        _id: username,
        exp: exp.getTime() / 1000,
      },
      config.jwtSecret,
    );
  }
}
