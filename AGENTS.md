# Agent Instructions

- After creating or changing TypeScript, React, Next.js, or JavaScript code, use the `typescript-react-code-reviewer` skill before reporting the work as complete. Apply any necessary fixes found during that review.
- After finishing code implementation for any ticket or feature, run the `bmad-code-review` skill as a required final review step. Apply any necessary fixes found during that review, then summarize the final outcome.
- Before considering any ticket or feature complete, run a UX/UI review to verify that components are placed where users expect them, the interaction flow follows a clear product logic, and the UI does not mix admin workflows into member-facing experiences unless intentionally designed.
- Before considering any ticket or feature complete, use the QA automation process to define the necessary happy-path, edge-case, negative, authorization, and regression test cases. Implement or update the relevant automated tests and only mark the work complete after the selected verification suite passes.
- Always add validation and expected-format guidance to user-entered fields. Validate both client-side and server-side where applicable, and format specialized fields such as currency, email, phone, dates, and URLs so invalid data cannot silently reach persistence.
