// src/App.tsx

import React, { useEffect, useState } from 'react';

interface Value {
    id: number; // Adjust the type based on your actual table structure
    delivery_type: string; // Adjust the type based on your actual table structure
    route: string; // Adjust the type based on your actual table structure
    first_cost: number; // Adjust the type based on your actual table structure
    extra_cost: number; // Adjust the type based on your actual table structure
}

const App: React.FC = () => {
    const [values, setValues] = useState<Value[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchValues = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/get_shipping_rates?column=first_cost');
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
                        <tr key={value.id}>
                            <td>{value.id}</td>
                            <td>{value.delivery_type}</td>
                            <td>{value.route}</td>
                            <td>{value.first_cost}</td>
                            <td>{value.extra_cost}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default App;