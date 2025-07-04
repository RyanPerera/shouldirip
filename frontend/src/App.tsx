// src/App.tsx

import React, { useEffect, useState } from 'react';

interface Value {
    ID: number; // Adjust the type based on your actual table structure
    cell_value: number; // Adjust the type based on your actual table structure
}

const App: React.FC = () => {
    const [values, setValues] = useState<Value[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchValues = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/get_values');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data: Value[] = await response.json();
                setValues(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchValues();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Values from Database</h1>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cell Value</th>
                    </tr>
                </thead>
                <tbody>
                    {values.map(value => (
                        <tr key={value.ID}>
                            <td>{value.ID}</td>
                            <td>{value.cell_value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default App;