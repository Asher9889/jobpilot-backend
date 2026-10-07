import { IUser } from "../modules/user/index.ts";


declare global {
  namespace Express { 
    interface Request {
      validatedBody: unknown;
      validatedUser: IUser;
      validatedParams: unknown;
      validatedQuery: unknown; 
    }
  }
}