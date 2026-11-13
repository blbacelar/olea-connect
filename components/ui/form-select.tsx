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
  ariaLabel,
  id,
  disabled,
}: {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name: string;
  options: FormSelectOption[];
  placeholder: string;
  required?: boolean;
  value?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange} required={required} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className="mt-2 h-11 min-w-0 max-w-full bg-white [&>span]:min-w-0 [&>span]:truncate">
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
