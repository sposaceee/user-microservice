INSERT INTO users (id, name, email, role)
VALUES (
    '9218b941-d619-467d-a1be-aa04db9c3e93',
    'Admin',
    'admin@example.com',
    'admin'
)
ON CONFLICT (id) DO NOTHING;
