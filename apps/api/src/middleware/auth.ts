import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { z } from "zod";

type AuthClaims = {
  sub: string;
  role: "admin" | "operator" | "viewer";
};

const RoleSchema = z.enum(["admin", "operator", "viewer"]);
export type RequestWithAuth = Request & { auth?: AuthClaims };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const parsedRole = RoleSchema.safeParse(decoded.role);
    if (!decoded.sub || !parsedRole.success) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    (req as RequestWithAuth).auth = {
      sub: String(decoded.sub),
      role: parsedRole.data
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
