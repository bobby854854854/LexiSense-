import { type User, type InsertUser, type Contract, type InsertContract } from "@shared/schema";
import { db } from "./db";
import { contracts } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllContracts(): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    throw new Error("Not implemented");
  }

  async getAllContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const results = await db.select().from(contracts).where(eq(contracts.id, id));
    return results[0];
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const results = await db.insert(contracts).values(contract).returning();
    return results[0];
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const results = await db
      .update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return results[0];
  }

  async deleteContract(id: string): Promise<boolean> {
    const results = await db.delete(contracts).where(eq(contracts.id, id)).returning();
    return results.length > 0;
  }
}

export const storage = new DbStorage();
