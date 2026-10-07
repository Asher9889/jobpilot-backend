import { IUser } from "../modules/user";


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