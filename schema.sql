DROP TABLE IF EXISTS locations, weather, events;

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7)
);

CREATE TABLE IF NOT EXISTS weather (
    id SERIAL PRIMARY KEY,
    forecast VARCHAR(255),
    time VARCHAR(255),
    created_at BIGINT,
    location_id INTEGER NOT NULL REFERENCES locations(id) 
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    link VARCHAR(255), 
    name VARCHAR(255),
    event_date CHAR(15),
    summary VARCHAR(1000),
    location_id INTEGER NOT NULL REFERENCES locations(id) 
);