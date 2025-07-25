CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY,
                                     name TEXT NOT NULL,
                                     email TEXT UNIQUE NOT NULL,
                                     role TEXT  NOT NULL  DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
                                     created_at TIMESTAMPTZ DEFAULT NOW(),
                                    profile_picture VARCHAR(255)
    );
