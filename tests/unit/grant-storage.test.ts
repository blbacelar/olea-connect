import { describe, expect, it } from "vitest";

import {
  buildGrantAttachmentStoragePath,
  validateGrantAttachmentFile,
} from "@/lib/grants/storage";

describe("grant attachment storage helpers", () => {
  it("builds a tenant-scoped storage path for grant attachments", () => {
    const path = buildGrantAttachmentStoragePath(
      "org-123",
      "grant-456",
      "Budget Final v2.pdf",
    );

    expect(path).toContain("org-123/grant-456/");
    expect(path).toContain("Budget-Final-v2.pdf");
  });

  it("rejects unsupported mime types and oversized files", () => {
    const oversizedFile = new File(["x".repeat(26 * 1024 * 1024)], "large.pdf", {
      type: "application/pdf",
    });

    expect(() => validateGrantAttachmentFile(oversizedFile)).toThrow(
      /25 MB or smaller/i,
    );

    const unsupportedFile = new File(["hello"], "notes.exe", {
      type: "application/x-msdownload",
    });

    expect(() => validateGrantAttachmentFile(unsupportedFile)).toThrow(
      /html, javascript, and executable files/i,
    );
  });
});
