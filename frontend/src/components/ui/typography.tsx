import React from "react";
import { cn } from "@/lib/utils";

export const H1: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h1 className={cn("scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl", className)} {...props} />
);

export const H2: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h2 className={cn("scroll-m-20 border-b py-2 text-3xl font-semibold tracking-tight first:mt-0", className)} {...props} />
);

export const H3: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)} {...props} />
);

export const H4: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h4 className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)} {...props} />
);

export const Lead: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn("text-xl text-muted-foreground", className)} {...props} />
);

export const P: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)} {...props} />
);

export const Large: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("text-lg font-semibold", className)} {...props} />
);

export const Small: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn("text-sm font-medium leading-none", className)} {...props} />
);

export const Muted: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...props }) => (
  <span className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const InlineCode: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, ...props }) => (
  <code className={cn("relative rounded-sm bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold", className)} {...props} />
);

export const MultilineCode: React.FC<React.HTMLAttributes<HTMLPreElement>> = ({ className, ...props }) => (
  <pre className={cn("relative rounded-sm bg-muted p-4 font-mono text-sm font-semibold overflow-x-auto", className)} {...props} />
);

export const List: React.FC<React.HTMLAttributes<HTMLUListElement>> = ({ className, ...props }) => (
  <ul className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)} {...props} />
);

export const Quote: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, ...props }) => (
  <blockquote className={cn("mt-6 border-l-2 pl-6 italic text-muted-foreground", className)} {...props} />
);
