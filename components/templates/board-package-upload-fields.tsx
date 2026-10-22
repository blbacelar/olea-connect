import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  documentCategories,
  type UploadFormState,
} from "./board-package-upload-state";

export function BoardPackageUploadFields({
  form,
  onFileChange,
  onUpdateForm,
}: {
  form: UploadFormState;
  onFileChange: (file: File | null) => void;
  onUpdateForm: <Key extends keyof UploadFormState>(
    key: Key,
    value: UploadFormState[Key],
  ) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="board-package-document-name">Document name</Label>
        <Input
          id="board-package-document-name"
          value={form.name}
          onChange={(event) => onUpdateForm("name", event.target.value)}
          placeholder="Board agenda, finance report, approved minutes..."
        />
      </div>
      <CategoryField form={form} onUpdateForm={onUpdateForm} />
      <div className="space-y-2">
        <Label htmlFor="board-package-document-size">Size or version label</Label>
        <Input
          id="board-package-document-size"
          value={form.sizeLabel}
          onChange={(event) => onUpdateForm("sizeLabel", event.target.value)}
          placeholder="2.4 MB, v1, approved"
        />
      </div>
      <FileUploadField onFileChange={onFileChange} />
      <ExternalLinkField form={form} onUpdateForm={onUpdateForm} />
      <label className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.confidential}
          onChange={(event) => onUpdateForm("confidential", event.target.checked)}
          className="size-4 rounded border-slate-300"
        />
        Require confidentiality acknowledgement before opening
      </label>
    </div>
  );
}

function CategoryField({
  form,
  onUpdateForm,
}: {
  form: UploadFormState;
  onUpdateForm: <Key extends keyof UploadFormState>(
    key: Key,
    value: UploadFormState[Key],
  ) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="board-package-document-category">Document category</Label>
      <Select
        value={form.category}
        onValueChange={(value) => onUpdateForm("category", value)}
      >
        <SelectTrigger id="board-package-document-category" aria-label="Document category">
          <SelectValue placeholder="Choose category" />
        </SelectTrigger>
        <SelectContent>
          {documentCategories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FileUploadField({
  onFileChange,
}: {
  onFileChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="board-package-document-file">Private file upload</Label>
      <Input
        id="board-package-document-file"
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/png,image/jpeg,image/webp"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <p className="text-xs leading-5 text-slate-500">
        PDF, Word, Excel, text, PNG, JPG, or WebP up to 25 MB.
      </p>
    </div>
  );
}

function ExternalLinkField({
  form,
  onUpdateForm,
}: {
  form: UploadFormState;
  onUpdateForm: <Key extends keyof UploadFormState>(
    key: Key,
    value: UploadFormState[Key],
  ) => void;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="board-package-document-url">
        External document link
        <span className="ml-1 text-slate-400">(optional)</span>
      </Label>
      <Input
        id="board-package-document-url"
        type="url"
        value={form.url}
        onChange={(event) => onUpdateForm("url", event.target.value)}
        placeholder="https://... only when the file is stored outside Olea Connects™"
      />
    </div>
  );
}
