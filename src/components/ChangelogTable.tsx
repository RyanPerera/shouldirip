import changelog from "../CHANGELOG.json";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function ChangelogTable() {
    return (
        <Table>
            <TableCaption>Changelog</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Change</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {changelog.slice().reverse().map((entry, index) => (
                    <TableRow key={index}>
                        <TableCell className="text-left">{entry.change}</TableCell>
                        <TableCell className="text-right">{entry.date}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
