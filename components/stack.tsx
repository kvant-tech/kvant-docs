import * as React from "react";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Define breakpoints and their corresponding min-widths for media queries
const breakpoints = {
  sm: "640px", // Example breakpoint min-widths
  md: "768px",
  lg: "1024px",
  xl: "1280px",
};

type BreakPoint = keyof typeof breakpoints;
type Gap = number | { [key in BreakPoint]?: number };
type Direction = "column" | "row" | { [key in BreakPoint]?: "column" | "row" };

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  direction?: Direction;
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
}

function convertNumberIntoPx(n: number) {
  return `${n * 4}px`;
}

function convertGapToProps(gap?: Gap) {
  if (typeof gap === "number") {
    return { gap: convertNumberIntoPx(gap) }; // Applies universally if gap is a number
  } else if (gap && typeof gap === "object") {
    return Object.entries(gap).reduce((acc, [breakpoint, value]) => {
      // Use CSS variables for gap values at different breakpoints
      acc[`--gap-${breakpoint}`] = convertNumberIntoPx(value);
      return acc;
      // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    }, {} as Record<string, Object>);
  }
  return {};
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, gap, direction, align, justify, ...props }, ref) => {
    const styles = convertGapToProps(gap);

    // Append styles for direction changes at specified breakpoints
    if (direction && typeof direction === "object") {
      Object.entries(direction).forEach(([breakpoint, dirValue]) => {
        const minWidth = breakpoints[breakpoint as BreakPoint];
        if (!styles[`@media (min-width: ${minWidth})`]) {
          styles[`@media (min-width: ${minWidth})`] = {};
        }
        (
          styles[`@media (min-width: ${minWidth})`] as React.CSSProperties
        ).flexDirection = dirValue;
      });
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex [align-items:var(--align-items)] [justify-content:var(--justify-content)]",
          !direction && "flex-col",
          typeof gap === "number"
            ? convertGapToProps(gap)
            : [
                gap?.sm && "sm:gap-[var(--gap-sm)]",
                gap?.md && "md:gap-[var(--gap-md)]",
                gap?.lg && "lg:gap-[var(--gap-lg)]",
                gap?.xl && "xl:gap-[var(--gap-xl)]",
              ],
          className
        )}
        style={
          {
            ...styles,
            "--align-items": align,
            "--justify-content": justify,
          } as React.CSSProperties
        }
        {...props}
      >
        {props.children}
      </div>
    );
  }
);
Stack.displayName = "Stack";

export { Stack };
