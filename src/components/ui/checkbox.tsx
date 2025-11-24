import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      `
      peer rounded-sm border border-primary ring-offset-background
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50

      /* 기본 크기 (모바일) */
      h-3 w-3

      /* 화면 크기별 반응형 */
      md:h-4 md:w-4
      lg:h-5 lg:w-5

      /* 체크 되었을 때 크기 증가 */
      transition-all duration-200 ease-in-out
      data-[state=checked]:h-4 data-[state=checked]:w-4
      md:data-[state=checked]:h-5 md:data-[state=checked]:w-5
      lg:data-[state=checked]:h-6 lg:data-[state=checked]:w-6

      /* 체크 시 배경 및 포그라운드 */
      data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground
      `,
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        `
        flex items-center justify-center text-current
        transition-all duration-200 ease-in-out
        `
      )}
    >
      <Check
        className="
          h-2.5 w-2.5
          md:h-3 md:w-3
          lg:h-4 lg:w-4
        "
      />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
