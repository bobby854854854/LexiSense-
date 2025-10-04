import type { Contract, AIInsight } from "@shared/schema";

export async function getContracts(): Promise<Contract[]> {
  const response = await fetch("/api/contracts");
  if (!response.ok) throw new Error("Failed to fetch contracts");
  return response.json();
}

export async function getContract(id: string): Promise<Contract> {
  const response = await fetch(`/api/contracts/${id}`);
  if (!response.ok) throw new Error("Failed to fetch contract");
  return response.json();
}

export async function analyzeContract(data: {
  text: string;
  title: string;
  counterparty: string;
  contractType: string;
}): Promise<Contract> {
  const response = await fetch("/api/contracts/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to analyze contract");
  return response.json();
}

export async function draftContract(data: {
  contractType: string;
  party1: string;
  party2: string;
  value: string;
  terms: string;
}): Promise<{ contract: string }> {
  const response = await fetch("/api/contracts/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to draft contract");
  return response.json();
}

export async function deleteContract(id: string): Promise<void> {
  const response = await fetch(`/api/contracts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete contract");
}
