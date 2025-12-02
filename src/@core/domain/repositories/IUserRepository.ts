import { User } from "../entities/user/User";

export interface IUserRepository {
    create(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    update(user: User): Promise<void>;
    delete(id: string): Promise<void>;
}
