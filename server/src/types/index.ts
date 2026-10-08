export type Role = "Manager" | "Employee";

export interface JwtPayload {
  id: number;
  email: string;
  role: Role;
}

// req.user is set by the authenticate middleware
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
