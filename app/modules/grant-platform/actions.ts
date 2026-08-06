"use server";

import { revalidatePath } from "next/cache";

import {
  saveGrantApplication,
  withdrawGrantApplication,
} from "@/app/grants/actions";

export async function saveGrantPlatformApplication(formData: FormData) {
  await saveGrantApplication(formData);
  revalidatePath("/modules/grant-platform");
  revalidatePath("/grants");
}

export async function withdrawGrantPlatformApplication(formData: FormData) {
  await withdrawGrantApplication(formData);
  revalidatePath("/modules/grant-platform");
  revalidatePath("/grants");
}
