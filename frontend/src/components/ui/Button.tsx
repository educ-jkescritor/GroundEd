import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "ai";
type Size = "sm" | "md";
type Shape = "default" | "pill";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold no-underline transition-colors " +
  "hover:no-underline disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-lapis";

// DESIGN.md §10: primary = lapis (one per view), secondary = outlined, ghost = text, ai = violet (AI actions only).
const variants: Record<Variant, string> = {
  primary: "bg-lapis text-white hover:bg-lapis-deep",
  secondary: "border border-line bg-surface text-ink hover:border-ink/40",
  ghost: "text-ink-muted hover:bg-ink/5 hover:text-ink",
  ai: "bg-ai text-white hover:bg-ai/90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-sm",
  md: "min-h-11 px-5 text-[15px]",
};

const shapes: Record<Shape, string> = {
  default: "rounded-[var(--radius-control)]",
  pill: "rounded-full",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "", shape: Shape = "default") {
  return `${base} ${variants[variant]} ${sizes[size]} ${shapes[shape]} ${extra}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; shape?: Shape };

export function Button({ variant = "primary", size = "md", shape = "default", className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className, shape)} {...rest} />;
}

type ButtonLinkProps = LinkProps & { variant?: Variant; size?: Size; shape?: Shape };

export function ButtonLink({ variant = "primary", size = "md", shape = "default", className = "", ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className, shape)} {...rest} />;
}
