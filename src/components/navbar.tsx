"use client";
import { CircleHelpIcon } from "lucide-react";

import { NavigationMenu, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { H1, Small } from "./ui/typography"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";


export function Navbar() {
    return (
        <NavigationMenu className="py-3 px-5 max-w-7xl flex mx-auto" viewport={false}>
            <div className="flex justify-between w-full">
                <NavigationMenuItem className="flex">
                    <NavigationMenuLink href="/shouldirip">
                        <H1>Should I Rip?</H1>
                    </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem className="flex items-center gap-2">
                    Last Updated: Today
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <CircleHelpIcon />
                        </TooltipTrigger>
                        <TooltipContent>
                            <Small>Data is fetched from TCGPlayer daily</Small>
                        </TooltipContent>
                    </Tooltip>
                </NavigationMenuItem>
            </div>
        </NavigationMenu>
    )
}

// function ListItem({
//     title,
//     children,
//     href,
//     ...props
// }: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
//     return (
//         <li {...props}>
//             <NavigationMenuLink asChild>
//                 <a href={href}>
//                     <div className="text-sm leading-none font-medium">{title}</div>
//                     <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
//                         {children}
//                     </p>
//                 </a>
//             </NavigationMenuLink>
//         </li>
//     )
// }
