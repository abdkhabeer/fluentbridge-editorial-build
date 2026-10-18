import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full px-4 py-3 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-navy focus-visible:ring-1 focus-visible:ring-navy transition-colors font-sans text-base sm:text-sm aria-[invalid=true]:border-destructive";

export const ErrorText = ({ id, children }: { id?: string; children?: ReactNode }) =>
  children ? (
    <p id={id} role="alert" className="mt-2 text-sm text-destructive">
      {children}
    </p>
  ) : null;

type FieldProps = {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Label + control + hint + inline error, wired up for screen readers. */
export const Field = ({ label, error, hint, optional, children }: FieldProps) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-label text-foreground block mb-2">
        {label}
        {optional && " "}
        {optional && <span className="ml-2 normal-case tracking-normal font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children({ id, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
      {hint && (
        <p id={hintId} className="mt-2 text-xs text-muted-foreground leading-relaxed">
          {hint}
        </p>
      )}
      <ErrorText id={errorId}>{error}</ErrorText>
    </div>
  );
};

type Option = { value: string; label: string; description?: ReactNode; badge?: string };

type GroupProps = {
  legend: string;
  description?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
};

export const Group = ({ legend, description, error, optional, children }: GroupProps) => {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="font-serif text-xl sm:text-2xl text-foreground mb-2">
        {legend}
        {optional && " "}
        {optional && <span className="ml-2 font-sans text-sm text-muted-foreground">(optional)</span>}
      </legend>
      {description && <div className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</div>}
      <div className={cn(!description && "mt-4")}>{children}</div>
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </fieldset>
  );
};

const choiceBase =
  "relative flex w-full items-start gap-3 border px-4 py-3.5 text-left transition-colors cursor-pointer focus-within:ring-1 focus-within:ring-navy";

/** Single choice rendered as large tappable cards (native radio inputs for accessibility). */
export const RadioCards = ({
  name,
  options,
  value,
  onChange,
  invalid,
  columns = 1,
}: {
  name: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  columns?: 1 | 2;
}) => (
  <div className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2")}>
    {options.map((o) => {
      const checked = value === o.value;
      return (
        <label
          key={o.value}
          className={cn(
            choiceBase,
            checked ? "border-navy bg-secondary" : "border-border bg-background hover:border-navy/40",
            invalid && !value && "border-destructive/60",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={checked}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          <span
            aria-hidden
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 rounded-full border",
              checked ? "border-navy border-[5px]" : "border-muted-foreground/50",
            )}
          />
          <span className="flex-1">
            <span className="flex flex-wrap items-center gap-2 text-sm text-foreground">
              {o.label}
              {o.badge && <span className="text-[0.65rem] uppercase tracking-widest text-navy bg-navy/10 px-2 py-0.5">{o.badge}</span>}
            </span>
            {o.description && <span className="block mt-1 text-xs text-muted-foreground leading-relaxed">{o.description}</span>}
          </span>
        </label>
      );
    })}
  </div>
);

/** Multiple choice rendered as toggle chips (native checkboxes). */
export const CheckboxChips = ({
  options,
  values,
  onChange,
  disabled = [],
}: {
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: string[];
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const checked = values.includes(o.value);
      const isDisabled = disabled.includes(o.value);
      return (
        <label
          key={o.value}
          className={cn(
            "inline-flex items-center gap-2 border px-3.5 py-2.5 text-sm transition-colors focus-within:ring-1 focus-within:ring-navy",
            isDisabled
              ? "opacity-40 cursor-not-allowed border-border"
              : checked
                ? "cursor-pointer border-navy bg-secondary text-foreground"
                : "cursor-pointer border-border bg-background text-foreground hover:border-navy/40",
          )}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            disabled={isDisabled}
            onChange={() => onChange(checked ? values.filter((v) => v !== o.value) : [...values, o.value])}
          />
          <span
            aria-hidden
            className={cn("flex h-4 w-4 items-center justify-center border", checked ? "bg-navy border-navy text-warm-white" : "border-muted-foreground/50")}
          >
            {checked && <Check size={12} strokeWidth={3} />}
          </span>
          {o.label}
        </label>
      );
    })}
  </div>
);

export const PrimaryButton = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    // text-label is applied outside cn(): tailwind-merge would treat it as conflicting with text-<color>.
    className={"text-label " + cn(
      "px-8 py-4 bg-foreground text-background hover:bg-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
      className,
    )}
  />
);

export const SecondaryButton = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={"text-label " + cn(
      "px-8 py-4 border border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
      className,
    )}
  />
);

export const Notice = ({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "error" }) => (
  <div
    role={tone === "error" ? "alert" : undefined}
    className={cn(
      "border-l-2 px-4 py-3 text-sm leading-relaxed",
      tone === "info" && "border-navy bg-secondary text-foreground",
      tone === "warning" && "border-amber-600 bg-amber-50 text-amber-950",
      tone === "error" && "border-destructive bg-destructive/5 text-foreground",
    )}
  >
    {children}
  </div>
);
