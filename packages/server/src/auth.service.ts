import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "./db/client.js";
import { users } from "./db/schema.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dashwire-key";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const buffer = scryptSync(password, salt, 64);
  return `${salt}:${buffer.toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  const buffer = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(key, "hex");
  return timingSafeEqual(buffer, storedBuffer);
}

export function hasAnyAdmin(): boolean {
  const admin = db.select().from(users).where(eq(users.role, "admin")).limit(1).get();
  return !!admin;
}

export function createAdminUser(username: string, password: string) {
  if (hasAnyAdmin()) {
    throw new Error("Admin account bestaat al.");
  }
  return createUserRecord(username, password, "admin");
}

export function createUserRecord(username: string, password: string, role: "admin" | "user" = "user") {
  const id = randomBytes(8).toString("hex");
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  db.insert(users).values({
    id,
    username,
    passwordHash,
    role,
    createdAt: now,
  }).run();

  return jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: "7d" });
}

export function authenticateUser(username: string, password: string) {
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Ongeldige gebruikersnaam of wachtwoord.");
  }
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): { id: string; username: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
    return decoded;
  } catch {
    return null;
  }
}

export function listUsers() {
  return db.select({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt }).from(users).all();
}

export function deleteUser(userId: string, currentUserId: string) {
  if (userId === currentUserId) {
    throw new Error("Je kunt je eigen admin-account niet verwijderen.");
  }
  db.delete(users).where(eq(users.id, userId)).run();
}
