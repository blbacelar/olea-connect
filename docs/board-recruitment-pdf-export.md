# Board Recruitment PDF Export

The Board Recruitment **Board Report** tab exports a server-generated PDF from
`GET /api/board-recruitment/export`. The route requires an authenticated member
session, loads the current organization-scoped recruitment workspace, snapshots
the organization branding, and renders the report with `@react-pdf/renderer`.

The PDF layout is intentionally independent of the application shell:

- Page 1 is a branded cover page with the organization, survey year, report view,
  and generation date.
- Following pages contain an executive summary, skills coverage and recruitment
  priorities, board terms and succession, committee assignments, and survey
  invitation/response status.
- Content pages use the organization logo/name in the header and organization
  contact details plus page numbering in the footer.
- The Identified/Anonymous control changes whether director names are included.

The export is downloaded in the browser with the organization/year filename from
the server response. It does not use `window.print()`, which would include the
authenticated application navigation and produce an incomplete report.

Verification is covered by the Board Recruitment E2E export test. It asserts a
PDF download, branded filename, multiple pages, cover content, report content,
anonymous-view content, and the absence of application-shell content.
