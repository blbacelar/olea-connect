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
  onValueChange,
  name,
  options,
  placeholder,
  required,
  value,
}: {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name: string;
  options: FormSelectOption[];
  placeholder: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange} required={required}>
      <SelectTrigger className="mt-2 h-11 min-w-0 max-w-full bg-white [&>span]:min-w-0 [&>span]:truncate">
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
