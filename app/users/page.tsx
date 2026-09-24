import { Building2, Handshake, Search, UsersRound } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getOrganizationDirectory,
  parseDirectorySearch,
} from "@/lib/data/organization-directory";
import { parseUserDirectoryPage } from "@/lib/data/user-directory";
import type { Locale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const copy: Record<Locale, {
  title: string;
  description: string;
  search: string;
  searchPlaceholder: string;
  clear: string;
  accountRegistry: string;
  organization: string;
  organizations: string;
  person: string;
  people: string;
  member: string;
  members: string;
  sponsor: string;
  empty: string;
  noResults: string;
  previous: string;
  next: string;
  page: (page: number, lastPage: number) => string;
}> = {
  "en-CA": {
    title: "Users Directory",
    description: "Find organizations and the people who belong to them across Olea Connects.",
    search: "Search directory",
    searchPlaceholder: "Search an organization or person",
    clear: "Clear search",
    accountRegistry: "Account registry",
    organization: "organization",
    organizations: "organizations",
    person: "person",
    people: "people",
    member: "member",
    members: "members",
    sponsor: "Sponsor",
    empty: "No organizations with active members yet.",
    noResults: "No organizations or people match your search.",
    previous: "Previous",
    next: "Next",
    page: (page, lastPage) => `Page ${page} of ${lastPage}`,
  },
  "fr-CA": {
    title: "Répertoire des utilisateurs",
    description: "Trouvez les organisations et les personnes qui en font partie dans Olea Connects.",
    search: "Rechercher dans le répertoire",
    searchPlaceholder: "Rechercher une organisation ou une personne",
    clear: "Effacer la recherche",
    accountRegistry: "Registre des comptes",
    organization: "organisation",
    organizations: "organisations",
    person: "personne",
    people: "personnes",
    member: "membre",
    members: "membres",
    sponsor: "Commanditaire",
    empty: "Aucune organisation avec des membres actifs pour le moment.",
    noResults: "Aucune organisation ni personne ne correspond à votre recherche.",
    previous: "Précédent",
    next: "Suivant",
    page: (page, lastPage) => `Page ${page} sur ${lastPage}`,
  },
};

function pageHref(page: number, search: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("q", search);
  return `/users?${params.toString()}`;
}

export default async function UsersDirectoryPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[]; q?: string | string[] };
}) {
  const locale = getRequestLocale();
  const text = copy[locale];
  const directory = await getOrganizationDirectory(
    parseUserDirectoryPage(searchParams?.page),
    parseDirectorySearch(searchParams?.q),
    locale,
  );
  const number = new Intl.NumberFormat(locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{text.title}</h1>
          <p className="mt-2 text-slate-600">{text.description}</p>
        </div>
        {directory.canViewPrivateDetails ? (
          <Button asChild variant="outline">
            <Link href="/settings/users">{text.accountRegistry}</Link>
          </Button>
        ) : null}
      </div>

      <form action="/users" method="get" role="search" className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="directory-search" className="mb-2 block text-sm font-semibold text-slate-800">
            {text.search}
          </label>
          <Input
            id="directory-search"
            name="q"
            type="search"
            maxLength={80}
            defaultValue={directory.search}
            placeholder={text.searchPlaceholder}
          />
        </div>
        <Button type="submit" className="gap-2">
          <Search aria-hidden="true" className="size-4" />
          {text.search}
        </Button>
        {directory.search ? (
          <Button asChild variant="outline">
            <Link href="/users">{text.clear}</Link>
          </Button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600" aria-live="polite">
        <span className="inline-flex items-center gap-2">
          <Building2 aria-hidden="true" className="size-4 text-olea-green" />
          {number.format(directory.organizationCount)} {directory.organizationCount === 1 ? text.organization : text.organizations}
        </span>
        <span className="inline-flex items-center gap-2">
          <UsersRound aria-hidden="true" className="size-4 text-olea-green" />
          {number.format(directory.personCount)} {directory.personCount === 1 ? text.person : text.people}
        </span>
      </div>

      {directory.organizations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            {directory.search ? text.noResults : text.empty}
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2" data-testid="organization-directory">
          {directory.organizations.map((organization) => (
            <Card key={organization.id} className="overflow-hidden" data-testid="organization-card">
              <section aria-labelledby={`organization-${organization.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-olea-light/40">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-olea-green shadow-sm">
                      <Building2 aria-hidden="true" className="size-5" />
                    </span>
                    <h2 id={`organization-${organization.id}`} className="min-w-0 break-all text-lg font-bold text-slate-900">
                      {organization.name}
                    </h2>
                  </div>
                  <Badge variant="outline" className="shrink-0 bg-white">
                    {organization.people.length} {organization.people.length === 1 ? text.member : text.members}
                  </Badge>
                </CardHeader>
                <CardContent className="py-1">
                  <ul className="divide-y divide-slate-100">
                    {organization.people.map((person) => (
                      <li key={person.id} className="flex min-w-0 items-center gap-3 py-3" data-testid="directory-person">
                        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-olea-light text-sm font-bold text-olea-green">
                          {person.name.slice(0, 1).toLocaleUpperCase(locale)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                            {person.isSponsor ? (
                              <Badge className="gap-1 bg-olea-green text-white">
                                <Handshake aria-hidden="true" className="size-3" />
                                {text.sponsor}
                              </Badge>
                            ) : null}
                            <span className="break-words">{person.name}</span>
                          </div>
                          {person.email ? <p className="break-all text-xs text-slate-600">{person.email}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </section>
            </Card>
          ))}
        </div>
      )}

      {directory.lastPage > 1 ? (
        <nav aria-label={text.page(directory.page, directory.lastPage)} className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">{text.page(directory.page, directory.lastPage)}</p>
          <div className="flex gap-2">
            {directory.page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(directory.page - 1, directory.search)}>{text.previous}</Link>
              </Button>
            ) : null}
            {directory.page < directory.lastPage ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(directory.page + 1, directory.search)}>{text.next}</Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
