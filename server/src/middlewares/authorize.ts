import { Role } from "../types";
import type { Request, Response, NextFunction } from "express";
export function authorize(role : Role){
    return (req: Request, res: Response, next: NextFunction) => {
        if(!req.user){
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        if(req.user.role !== role){
            res.status(403).json({ message: "Not authorized" });
            return;
        }
        next();
    }
}