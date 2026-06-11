import {
  mockMember,
  mockOrganization,
  mockTemplateSession,
  mockTemplates,
} from "@/lib/mock-data";
import type {
  BrandProfile,
  Member,
  Organization,
  Template,
  TemplateSession,
} from "@/lib/types";

const wait = (milliseconds = 80) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function getOrg(): Promise<Organization> {
  await wait();
  return structuredClone(mockOrganization);
}

export async function getMember(): Promise<Member> {
  await wait();
  return structuredClone(mockMember);
}

export async function getTemplates(): Promise<Template[]> {
  await wait();
  return structuredClone(mockTemplates);
}

export async function getTemplateBySlug(
  slug: string,
): Promise<Template | null> {
  await wait();
  const template = mockTemplates.find((item) => item.slug === slug);
  return template ? structuredClone(template) : null;
}

export async function getTemplateSession(): Promise<TemplateSession> {
  await wait();
  return structuredClone(mockTemplateSession);
}

export async function saveSession(
  session: TemplateSession,
): Promise<TemplateSession> {
  await wait(160);
  return { ...structuredClone(session), updatedAt: new Date().toISOString() };
}

export async function saveBrandProfile(
  brand: BrandProfile,
): Promise<BrandProfile> {
  await wait(220);
  return structuredClone(brand);
}
