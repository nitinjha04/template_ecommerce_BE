import { UserRole } from './index';

export type AuthUserPayload = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Returned by login, signup, and admin login — client must store `token`. */
export type AuthResponsePayload = {
  user: AuthUserPayload;
  token: string;
};
