import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FormSelectOption = {
  label: string;
  value: string;
};

export function FormSelect({
  defaultValue,
  name,
  options,
  placeholder,
  required,
}: {
  defaultValue?: string;
  name: string;
  options: FormSelectOption[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} required={required}>
      <SelectTrigger className="mt-2 h-11 bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
