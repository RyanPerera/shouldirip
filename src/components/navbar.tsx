"use client";
import { CircleHelpIcon } from "lucide-react";

import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { H1 } from "./ui/typography"


export function Navbar() {
    return (
        <NavigationMenu className="py-3 px-5 max-w-full" viewport={false}>
            <NavigationMenuList className="flex justify-between w-full flex-grow">

                <NavigationMenuItem className="flex max-w-[300px]">
                    <H1>Should I Rip?</H1>
                </NavigationMenuItem>
                {/* <div className="flex ml-auto"> */}
                {/* 
                    <NavigationMenuItem>
                        <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                            <a href="/docs">Docs</a>
                        </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger>List</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="grid w-[300px] gap-4">
                                <li>
                                    <NavigationMenuLink asChild>
                                        <a href="#">
                                            <div className="font-medium">Components</div>
                                            <div className="text-muted-foreground">
                                                Browse all components in the library.
                                            </div>
                                        </a>
                                    </NavigationMenuLink>
                                    <NavigationMenuLink asChild>
                                        <a href="#">
                                            <div className="font-medium">Documentation</div>
                                            <div className="text-muted-foreground">
                                                Learn how to use the library.
                                            </div>
                                        </a>
                                    </NavigationMenuLink>
                                    <NavigationMenuLink asChild>
                                        <a href="#">
                                            <div className="font-medium">Blog</div>
                                            <div className="text-muted-foreground">
                                                Read our latest blog posts.
                                            </div>
                                        </a>
                                    </NavigationMenuLink>
                                </li>
                            </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger>Simple</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="grid w-[200px] gap-4">
                                <li>
                                    <NavigationMenuLink asChild>
                                        <a href="#">Components</a>
                                    </NavigationMenuLink>
                                    <NavigationMenuLink asChild>
                                        <a href="#">Documentation</a>
                                    </NavigationMenuLink>
                                    <NavigationMenuLink asChild>
                                        <a href="#">Blocks</a>
                                    </NavigationMenuLink>
                                </li>
                            </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger>With Icon</NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="grid w-[200px] gap-4">
                                <li>
                                    <NavigationMenuLink asChild>
                                        <a href="#" className="flex-row items-center gap-2">
                                            <CircleHelpIcon />
                                            Backlog
                                        </a>
                                    </NavigationMenuLink>
                                    <NavigationMenuLink asChild>
                                        <a href="#" className="flex-row items-center gap-2">
                                            <CircleIcon />
                                            To Do
                                        </a>
                                    </NavigationMenuLink>
                                    <NavigationMenuLink asChild>
                                        <a href="#" className="flex-row items-center gap-2">
                                            <CircleCheckIcon />
                                            Done
                                        </a>
                                    </NavigationMenuLink>
                                </li>
                            </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem> */}
                <NavigationMenuItem>
                    Last Updated: Today <CircleHelpIcon />
                </NavigationMenuItem>
                {/* </div> */}
            </NavigationMenuList>
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
