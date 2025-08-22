"use client";
import { CircleHelpIcon } from "lucide-react";

import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { H1, Small } from "./components/ui/typography"
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from '../utils/supabase'


export function Navbar() {

    const [date, setDate] = useState("")

    useEffect(() => {
        async function getDate() {
            const { data, error } = await supabase
                .from('scraper_logs')
                .select('timestamp')
                .order('timestamp', { ascending: false })
                .limit(1)
                .single()

            if (error) {
                console.error('Error fetching date:', error.message);
            } else if (data) {
                setDate(data.timestamp);
            }
        }
        getDate()
    }, [])

    return (
        <NavigationMenu className="flex flex-grow  w-full px-5 py-4 top-0 absolute">

            <NavigationMenuList className="flex w-full items-center justify-between gap-4">

                <NavigationMenuItem>
                    <NavigationMenuLink href="/shouldirip" className="p-0">
                        <H1>Should I Rip?</H1>
                    </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem className="flex items-center gap-2">
                    Last Updated: {date
                        ? new Date(date).toLocaleString('en-CA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        })
                        : ''}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <CircleHelpIcon />
                        </TooltipTrigger>
                        <TooltipContent>
                            <Small>Data is fetched from TCGPlayer daily</Small>
                        </TooltipContent>
                    </Tooltip>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    )
}