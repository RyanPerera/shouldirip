"use client";;
import { HugeiconsIcon } from '@hugeicons/react';
import { Linkedin01FreeIcons, Github01FreeIcons } from '@hugeicons/core-free-icons';
import { Small } from './components/ui/typography';
export function Footer() {

    return (
        <div className="flex justify-end px-5 mx-auto max-w-8xl items-center gap-3 justify-self-end">

            <Small>Developed by Ryan Perera</Small>
            <a href='https://www.linkedin.com/in/ryan-perera/' target='_blank' rel="noreferrer">
                <HugeiconsIcon
                    icon={Linkedin01FreeIcons}
                    size={24}
                    color="currentColor"
                    strokeWidth={1.5}
                />
            </a>

            <br />

            <a href='https://ryanperera.github.io/ciphercollector/' target='_blank' rel="noreferrer">
                <HugeiconsIcon
                    icon={Github01FreeIcons}
                    size={24}
                    color="currentColor"
                    strokeWidth={1.5}
                />
            </a>
            <a href='https://ko-fi.com/F1F41K1WBN' target='_blank'><img height='36' style={{ border: 0, height: '36px' }} src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' alt='Buy Me a Coffee at ko-fi.com' /></a>
        </div>
    )
}