'use strict';

// provides access to enviromental variables in .env
require('dotenv').config();

// dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
const PORT = process.env.PORT || 3000;

// connect to database
const { Client } = require('pg');
const client = new Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));


app.use(cors());
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// APIs Routes
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/events', getEvents);
app.get('/movies', getMovies);

// handle errors
function handleError(error, response) {
  if (response) {
    response.status(500).send('Sorry, something went wrong here.');
  }
}

function Location(query, data) {
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

Location.prototype.save = function() {
  const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id`;
  const values = [this.search_query,
    this.formatted_address,
    this.latitude,
    this.longitude
  ];

  return client.query(SQL, values)
    .then(res => {
      return res.rows[0].id;
    });
};

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
  this.created_at = Date.now();
}

Weather.prototype.save = function(location_id) {
  const SQL = `INSERT INTO weather (forecast, time, location_id) VALUES ($1, $2, $3);`;
  const values = [this.forecast, this.time, location_id];

  client.query(SQL, values);

};

Weather.checkDatabase = checkDatabase;

function Event(event) {
  this.link = event.url;
  this.name = event.name.text;
  this.event_date = new Date(event.start.local).toString().slice(0, 15);
  this.summary = event.summary;
}

Event.prototype.save = function(location_id) {
  const SQL = `INSERT INTO events (link, name, event_date, summary, location_id) VALUES ($1, $2, $3, $4, $5);`;
  const values = [this.link, this.name, this.event_date, this.summary, location_id];

  client.query(SQL, values);
};

Event.checkDatabase = checkDatabase;

// movie constructor
function Movie(movie) {
  this.title = movie.title,
  this.overview = movie.overview,
  this.average_votes = movie.vote_average,
  this.total_votes = movie.vote_count,
  this.image_url = `https://image.tmdb.org/t/p/w200_and_h300_bestv2${movie.poster_path}`,
  this.popularity = movie.popularity,
  this.released_on = movie.release_date;
}


Movie.prototype.save = function(location_id) {
  const SQL = `INSERT INTO movies (title, overview, average_votes, image_url, popularity, released_on, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
  const values = [this.title, this.overview, this.average_votes, this.image_url, this.popularity, this.released_on, location_id];

  client.query(SQL, values);
};

Movie.checkDatabase = checkDatabase;

// go out to Google AP
function getLocation(request, response) {
  const locationHandler = {
    query: request.query.data,
    cacheHit: (results) => {
      response.send(results.rows[0]);
    },
    cacheMiss: () => {
      Location.fetchLocation(request.query.data)
        .then(results => {
          response.send(results);
        });
    },
  };

  Location.lookupLocation(locationHandler);
}

Location.lookupLocation = function(handler) {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [handler.query];

  return client.query(SQL, values)
    .then(result => {
      if(result.rowCount > 0) {
        handler.cacheHit(result);
      }
      else {
        handler.cacheMiss();
      }
    })
    .catch(console.error);
};

Location.fetchLocation = function(query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

  return superagent.get(url)
    .then(data => {
      if (!data.body.results.length) {throw `No Data`;}
      else {
        let location = new Location(query, data.body.results[0]);
        let saveLoc = location.save()
          .then(res => {
            location.id = res;
            return location;
          });
        return saveLoc;
      }
    });
};

// go out to dark sky api
function getWeather(request, response) {
  Weather.checkDatabase({
    tableName: 'weather',
    location: request.query.data.id,

    cacheHit: function (result) {
      response.send(result.rows);
    },
    cacheMiss: function () {
      const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

      superagent.get(url)
        .then(weatherResults => {
          if (!weatherResults.body.daily.data.length) { throw `NO DATA`;}
          else {
            const weatherSummaries = weatherResults.body.daily.data.map(day => {
              let summary = new Weather(day);
              summary.save(request.query.data.id);
              return summary;
            });
            response.send(weatherSummaries);
          }
        });
    }
  });
}

// // go out to eventbrite api
function getEvents(request, response) {
  Event.checkDatabase({
    tableName: 'events',
    location: request.query.data.id,

    cacheHit: function (result) {
      response.send(result.rows);
    },

    cacheMiss: function () {
      const url = `https://www.eventbriteapi.com/v3/events/search?token=${process.env.EVENTBRITE_API_KEY}&location.address=${request.query.data.formatted_query}`;

      superagent.get(url)
        .then(eventResults => {
          if (!eventResults.body.events.length) { throw `NO DATA`;}
          else {
            const events = eventResults.body.events.map(eventData => {
              let event = new Event(eventData);
              event.save(request.query.data.id);
              return event;

            });
            response.send(events);
          }
        });
    }
  });
}

// call out to movies
function getMovies(request, response) {
  Movie.checkDatabase({
    tableName: 'movies',
    location: request.query.data.id,

    cacheHit: function (result) {
      response.send(result.rows);
    },

    cacheMiss: function () {
      const URL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&language=en-US&query=${request.query.data.search_query};`;

      superagent.get(URL)
        .then(movieResults => {
          if(!movieResults.body.results.length) { throw `NO DATA`;}
          else {
            const movies = movieResults.body.results.map(movieData => {
              let movie = new Movie(movieData);
              movie.save(request.query.data.id);
              return movie;
            });

            response.send(movies);
          }
        });
    }
  });
}


// check database for results
function checkDatabase(options) {
  const SQL = `SELECT * FROM ${options.tableName} WHERE location_id=$1;`;
  const values = [options.location];

  client.query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        options.cacheHit(result);
      }
      else {
        options.cacheMiss(result);
      }
    })
    .catch(error => handleError(error));
}
