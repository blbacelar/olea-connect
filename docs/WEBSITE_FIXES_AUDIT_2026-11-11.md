# Website fixes review — Olea Connects

Source reviewed: `Website-Fixes-Olive-Olea.md` supplied on 2026-11-11. The requester confirmed that this delivery covers Olea Connects only. The file is a set of suggestions, not a replacement for product, legal, or pricing approval.

| Suggestion | Result in this branch |
| --- | --- |
| Legal, accessibility, and contact links in footers | Added shared EN/FR links to the landing footer, signup steps, auth card screens, legal pages, and member shell. New `/accessibility` page is public and included in the sitemap. The existing privacy and terms pages remain the source of policy text; Olive still needs to approve final legal wording. |
| Keep consent at signup | Existing checkboxes remain unchecked by default and linked policies open in a new tab. Client and server require all four consents. A disposable signup against development Supabase returned `verification_required`; all four consent records had policy versions and `recorded_at` timestamps. The QA user and provisioning request were removed and cleanup verified. |
| Show relationship and shared contact details | Added the Olive relationship link, `hello@olivesocialimpact.com` contact action, Kelowna region, and the parent site's verified `#discovery` booking path. The parent site's links were not changed. |
| Trust strip beside pricing | Added only claims already supported by current policy/product copy: no data sale, payment provider handles card details, organization owns its data, and the existing 15% pledge. Each links to its source page. Removed an unsupported blanket WCAG 2.1 AA claim from the older strip; did not claim Canadian data residency. |
| Founding-member FAQ and savings | Annual differences now match the pricing catalog: Seedling CAD $180, Roots CAD $530, Canopy CAD $1,060 per year for two years. The FAQ distinguishes quarterly savings. Removed the vague CAD $2,120 headline. |
| Plan comparison and add-ons | Added an EN/FR feature table with included seats, core tools, module inclusion or annual add-on price, and extra seats. Confirmed values against the existing pricing catalog and add-on descriptions. Removed the unexplained Recommended badge. |
| Lower-commitment path and demo | Homepage demo CTA now opens the existing module demos page, which shows the Board Calendar and Grant Platform videos. The videos are short, silent module walkthroughs. A narrated full-platform video and a separate free sample/offer still require approved content. |
| Book a call and Impact Accelerator | Added booking to footer and FAQ. Hid the undated Impact Accelerator teaser. |
| Podcast | Added Podcast to header/footer and a click-to-load embed of the current episode 2 near resources. The external player loads only after user action. An inbound `/podcast` link that attributes signups to the podcast and lands on Learning remains pending the Learning offer and attribution rules. |
| Generic copy and SEO | Replaced the vague hero promise in EN/FR, added an accessibility title/description and a public sitemap. Separate Features, Learning, Pricing, FAQ, and Resources pages need unique approved copy; duplicating the current landing page would not help search. |
| Olea Learning | Pending approved course names, durations, prices, enrolment flow, and membership-credit terms. The requester confirmed these are not defined. No public purchase promise or Learning navigation was added. |
| Testimonials and sponsored logos | Pending approved quotations, named attributions, organization logos, and permission to publish. No invented social proof or empty public section was added. A nondeveloper content editor is a separate CMS feature. |

## Verification

- Production build, TypeScript, focused ESLint, and full unit suite passed.
- Focused Chromium browser suite passed for pricing, signup consent UI, legal links, demo navigation, French content, mobile width, and the new accessibility route. Unauthenticated access to `/dashboard` still redirects to login.
- Automated WCAG 2.1 A/AA scan on landing, sponsorship, login, and account creation found no serious or critical violations after the click-to-load podcast embed and contrast fix. This is not a certification of the full platform.
- Desktop and 390px screenshots were inspected for the pricing cards, table, podcast, and footer.
- An authenticated development-Supabase browser smoke opened the member dashboard and displayed the new legal footer. An unauthenticated browser still redirected from `/dashboard` to login.
- A real development-Supabase signup confirmed four timestamped consent rows before the disposable account was deleted.
- Delivery of that signup's confirmation email to the QA mailbox was not checked in this pass; email templates and delivery code were unchanged.
- No database schema, billing, or signup persistence code changed. No production deployment is part of this branch.
