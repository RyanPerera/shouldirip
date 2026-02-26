"use client";
import { CircleHelpIcon } from "lucide-react";

import { H1, Small } from "./components/ui/typography"
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from '../utils/supabase'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import type { Currency } from "./lib/format";


type NavbarProps = {
    currency: Currency;
    onCurrencyChange: (currency: Currency) => void;
}

export function Navbar({ currency, onCurrencyChange }: NavbarProps) {

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
        <header className="absolute inset-x-0 top-0 w-full px-5 py-4">
            <div className="flex w-full items-start justify-between gap-4 sm:items-center">
                <div>
                    <a href="/shouldirip" className="p-0">
                        <H1 className="text-2xl sm:text-3xl lg:text-5xl">Should I Rip?</H1>
                    </a>
                </div>

                <div className="ml-auto flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="order-2 flex items-center gap-2 text-right text-xs sm:order-1 sm:text-sm">
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
                    </div>

                    <div className="order-1 sm:order-2">
                        <Select value={currency} onValueChange={(value) => onCurrencyChange(value as Currency)}>
                            <SelectTrigger className="min-w-32">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="USD">🇺🇸 USD</SelectItem>
                                    <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </header>
    )
}