DROP TABLE IF EXISTS locations, weather, events, movies, yelp;

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

CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    overview VARCHAR(1000),
    average_votes NUMERIC(3, 2),
    total_votes INTEGER,
    image_url VARCHAR(255),
    popularity VARCHAR(255),
    released_on CHAR(15),
    location_id INTEGER NOT NULL REFERENCES locations(id) 
);

CREATE TABLE IF NOT EXISTS yelp (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    image_url VARCHAR(255),
    price VARCHAR(255),
    rating VARCHAR(255),
    url VARCHAR(255),
    location_id INTEGER NOT NULL REFERENCES locations(id)
);