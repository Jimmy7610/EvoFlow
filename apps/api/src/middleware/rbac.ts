import { NextFunction, Request, Response } from "express";
import type { RequestWithAuth } from "./auth";

type Role = "admin" | "operator" | "viewer";

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = (req as RequestWithAuth).auth?.role;
    if (!role) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
