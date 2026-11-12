import type { Request, Response } from "express";
import { prisma } from "../db";
import { loginSchema, registerSchema, updateSchema } from "../schemas/authSchemas";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/token";
import type { Role } from "../types";

const WEEK = 7 * 24 * 60 * 60;
const publicUser = (u: { id: number; name: string; email: string; phone: string; role: string }) =>
  ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ message: "Validation error" }); return; }
  const { name, email, phone, password, role } = result.data;
  if (await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } })) {
    res.status(409).json({ message: "Email, or phone number already in use" });
    return;
  }
  const user = await prisma.user.create({ data: { name, email, phone, password: await hashPassword(password), role } });
  res.status(201).json(publicUser(user));
}

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ message: "Validation error" }); return; }
  const { email, password } = result.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role as Role }, process.env.JWT_SECRET!, WEEK);
  res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: WEEK * 1000 });
  res.json(publicUser(user));
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
}

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  res.json(publicUser(user));
}

export async function updateUser(req: Request, res: Response) {
  // Users update themselves; managers may update anyone.
  if (req.user!.id !== parseInt(req.params.id as string) && req.user!.role !== "Manager") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const result = updateSchema.partial().safeParse(req.body);
  if (!result.success) { res.status(400).json({ message: "Validation error" }); return; }
  const { email, phone } = result.data;
  if (email || phone) {
    const conflict = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])], NOT: { id: req.user!.id } },
    });
    if (conflict) { res.status(409).json({ message: "Email or phone already in use" }); return; }
  }
  const updated = await prisma.user.update({ where: { id: req.user!.id }, data: result.data });
  res.json(publicUser(updated));
}
