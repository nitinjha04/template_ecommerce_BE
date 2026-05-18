interface SignupInput {
    name: string;
    email: string;
    password: string;
}
interface LoginInput {
    email: string;
    password: string;
}
export declare class AuthService {
    static signup(input: SignupInput): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../types").UserRole;
        };
        token: string;
    }>;
    static login(input: LoginInput): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../types").UserRole;
        };
        token: string;
    }>;
    static getProfile(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("../types").UserRole;
    }>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map