import { redirect } from "next/navigation";

import { parseUserDirectoryPage } from "@/lib/data/user-directory";

export const dynamic = "force-dynamic";

export default function LegacyUsersDirectoryPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[] };
}) {
  const page = parseUserDirectoryPage(searchParams?.page);
  redirect(page === 1 ? "/users" : `/users?page=${page}`);
}
