const express = require('express');
const cors = require('cors');
const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const app = express();
app.use(cors());

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const credentials = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const redirect_uri = process.env.REDIRECT_URI;

let spotifyToken = '';
let tokenExpiresAt = 0;
let userAccessToken = '';
let userRefreshToken = '';

// Get weather conditions from location
app.get('/weather', async (req, res) => {
  const city = req.query.city;
  const response  = await fetch(`http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`);
  const data = await response.json();
  res.json(data);
  return data;
})

// Sign in to Spotify to get user info
app.get('/login', (req, res) => {
  const scope = 'user-top-read';
  const authUrl = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri
  });
  res.redirect(authUrl)
});

// Spotify redirige aquí después del login
app.get('/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    userAccessToken = access_token;
    userRefreshToken = refresh_token;

    // Por simplicidad, enviamos el token al frontend por query param
    res.redirect(`http://localhost:5500/frontend/home.html?access_token=${access_token}`);
    console.log('Redireccionando con redirect_uri:', redirect_uri);

  } catch (err) {
    console.error('Error en /callback:', err.response?.data || err.message);
    res.status(500).send('Error al obtener el token');
    console.log('Redireccionando con redirect_uri:', redirect_uri);
  }
});


const getToken = async () => {
  try {
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );
    spotifyToken = res.data.access_token;
    tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
    console.log('Nuevo token obtenido de Spotify');
  } catch (err) {
    console.error('Error obteniendo token:', err.response?.data || err.message);
  }
};

const ensureTokenValid = async () => {
  if (!spotifyToken || Date.now() >= tokenExpiresAt) {
    await getToken();
  }
};

// Obtener las canciones más escuchadas del usuario del short term
app.get('/tracks-short', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.access_token;
  
  if (!token) return res.status(401).send('No token proporcionado');

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    res.json(response.data);
    //console.log('Canciones más escuchadas obtenidas:', response.data);
  } catch (err) {
    console.error('Error en /top-tracks:', err.response?.data || err.message);
    res.status(500).send('Error al obtener las canciones más escuchadas');
  }
});

// Obtener los artistas más escuchados del usuario del short term
app.get('/artists-short', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.access_token;


  if (!token) return res.status(401).send('No token proporcionado');

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=10'
, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    res.json(response.data);
    //console.log('Artistas más escuchados obtenidos:', response.data);
  } catch (err) {
    console.error('Error en /top-artist:', err.response?.data || err.message);
    res.status(500).send('Error al obtener los artistas más escuchados');
  }
});


// Obtener las canciones más escuchadas del usuario del medium term
app.get('/tracks-medium', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.access_token;

  if (!token) return res.status(401).send('No token proporcionado');

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    res.json(response.data);
    //console.log('Canciones más escuchadas obtenidas:', response.data);
  } catch (err) {
    console.error('Error en /top-tracks:', err.response?.data || err.message);
    res.status(500).send('Error al obtener las canciones más escuchadas');
  }
});

// Obtener los artistas más escuchados del usuario del medium term
app.get('/artists-medium', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.access_token;

  if (!token) return res.status(401).send('No token proporcionado');

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });


    res.json(response.data);
    //console.log('Artistas más escuchados obtenidos:', response.data);
  } catch (err) {
    console.error('Error en /top-artist:', err.response?.data || err.message);
    res.status(500).send('Error al obtener los artistas más escuchados');
  }
});







const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
