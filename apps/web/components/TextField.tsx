import { useId } from "react";

type TextFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  defaultValue?: string;
};

export function TextField({ label, ...props }: TextFieldProps) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-forest"
        {...props}
      />
    </div>
  );
}
