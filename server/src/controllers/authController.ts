import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { loginSchema } from "../schemas/authSchemas";
import { registerSchema } from "../schemas/authSchemas";

export async function register(req: Request, res: Response) {
  // Step 1 — validate the request body against the schema
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ message: "Validation error" });
    return;
  }

  const { name, email, phone, password, role } = result.data;

  // Step 2 — check if a user already exists with the same email, username, or student ID
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });

  // Step 3 — if a match is found, reject the request
  if (existing) {
    res.status(409).json({ message: "Email, or phone number already in use" });
    return;
  }

  // Step 4 — hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  // Step 5 — create the user in the database
  const user = await prisma.user.create({
    data: { name, email, phone, password: hashedPassword, role },
  });

  // Step 6 — respond with the new user (never include the password)
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
}

export async function login(req: Request, res: Response) {
  // Step 1 — validate the request body
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ message: "Validation error" });
    return;
  }

  const { email, password } = result.data;

  // Step 2 — find the user by email
  const user = await prisma.user.findUnique({ where: { email } });

  // Step 3 — if no user found or password does not match, reject
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  // Step 4 — sign a JWT with the user's identity
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  // Step 5 — send the token as an HTTP-only cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Step 6 — respond with the user (never include the password)
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
}

export async function getMe(req: Request, res: Response) {
  // req.user was attached by the authenticate middleware
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
}

export async function updateUser(req: Request, res: Response) {
  // Step 1 — extract the target user ID from the route params

  const id = req.params.id as string;


  // Step 2 — only allow users to update themselves, unless they're an admin
  if (req.user!.id !== parseInt(id) && req.user!.role !== "Manager") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  // Step 3 — whitelist the fields that are allowed to be updated
  const { name, email, phone } = req.body;
  const updates: Record<string, unknown> = {};

  if (name) updates.name = name;
  if (email) updates.email = email;
  if (phone) updates.phone = phone;

  // Step 5 — check for email/phone conflicts on other accounts
  if (email || phone) {
    const conflict = await prisma.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
        NOT: { id: req.user!.id },
      },
    });

    if (conflict) {
      res.status(409).json({ message: "Email or phone already in use" });
      return;
    }
  }

  // Step 6 — perform the update
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: updates,
  });

  // Step 7 — respond without the password
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
  });
}

