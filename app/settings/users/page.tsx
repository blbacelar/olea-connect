import { Handshake } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getUserDirectory,
  parseUserDirectoryPage,
} from "@/lib/data/user-directory";
import type { Locale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const copy: Record<Locale, {
  title: string;
  description: string;
  accounts: string;
  name: string;
  email: string;
  workspace: string;
  status: string;
  joined: string;
  sponsor: string;
  confirmed: string;
  pending: string;
  noEmailStatus: string;
  noEmail: string;
  noWorkspace: string;
  empty: string;
  previous: string;
  next: string;
  page: (page: number, lastPage: number) => string;
}> = {
  "en-CA": {
    title: "Users Directory",
    description: "All registered accounts across Olea Connects. Only platform super administrators can see this directory.",
    accounts: "registered accounts",
    name: "Name",
    email: "Email",
    workspace: "Workspace",
    status: "Email status",
    joined: "Signed up",
    sponsor: "Sponsor",
    confirmed: "Confirmed",
    pending: "Pending confirmation",
    noEmailStatus: "No email address",
    noEmail: "No email",
    noWorkspace: "No workspace yet",
    empty: "No registered users found.",
    previous: "Previous",
    next: "Next",
    page: (page, lastPage) => `Page ${page} of ${lastPage}`,
  },
  "fr-CA": {
    title: "Répertoire des utilisateurs",
    description: "Tous les comptes inscrits à Olea Connects. Seuls les superadministrateurs de la plateforme peuvent consulter ce répertoire.",
    accounts: "comptes inscrits",
    name: "Nom",
    email: "Courriel",
    workspace: "Espace de travail",
    status: "État du courriel",
    joined: "Inscription",
    sponsor: "Commanditaire",
    confirmed: "Confirmé",
    pending: "Confirmation en attente",
    noEmailStatus: "Aucune adresse courriel",
    noEmail: "Aucun courriel",
    noWorkspace: "Aucun espace de travail",
    empty: "Aucun utilisateur inscrit.",
    previous: "Précédent",
    next: "Suivant",
    page: (page, lastPage) => `Page ${page} sur ${lastPage}`,
  },
};

export default async function UsersDirectoryPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[] };
}) {
  const locale = getRequestLocale();
  const text = copy[locale];
  const directory = await getUserDirectory(parseUserDirectoryPage(searchParams?.page));
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{text.title}</h1>
        <p className="mt-2 text-slate-600">{text.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {new Intl.NumberFormat(locale).format(directory.total)} {text.accounts}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {directory.users.length === 0 ? (
            <p className="py-8 text-center text-slate-600">{text.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text.name}</TableHead>
                  <TableHead className="hidden md:table-cell">{text.email}</TableHead>
                  <TableHead className="hidden lg:table-cell">{text.workspace}</TableHead>
                  <TableHead>{text.status}</TableHead>
                  <TableHead className="hidden lg:table-cell">{text.joined}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directory.users.map((user) => (
                  <TableRow key={user.id} data-testid="directory-user-row">
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                        {user.sponsorNames.length > 0 ? (
                          <Badge className="gap-1 bg-olea-green text-white">
                            <Handshake aria-hidden="true" className="size-3" />
                            {text.sponsor}
                          </Badge>
                        ) : null}
                        <span>{user.name}</span>
                      </div>
                      {user.sponsorNames.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {user.sponsorNames.join(", ")}
                        </p>
                      ) : null}
                      <p className="mt-1 break-all text-xs text-slate-600 md:hidden">
                        {user.email ?? text.noEmail}
                      </p>
                    </TableCell>
                    <TableCell className="hidden break-all md:table-cell">
                      {user.email ?? text.noEmail}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.organizations.length > 0
                        ? user.organizations.join(", ")
                        : text.noWorkspace}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={!user.email
                        ? "border-slate-200 bg-slate-50 text-slate-700"
                        : user.confirmed
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"}>
                        {!user.email ? text.noEmailStatus : user.confirmed ? text.confirmed : text.pending}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap lg:table-cell">
                      {dateFormatter.format(new Date(user.createdAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <nav aria-label={text.page(directory.page, directory.lastPage)} className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">{text.page(directory.page, directory.lastPage)}</p>
            <div className="flex gap-2">
              {directory.page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/settings/users?page=${directory.page - 1}`}>{text.previous}</Link>
                </Button>
              ) : null}
              {directory.page < directory.lastPage ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/settings/users?page=${directory.page + 1}`}>{text.next}</Link>
                </Button>
              ) : null}
            </div>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
