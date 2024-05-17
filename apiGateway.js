// apiGateway.js
const mongoose = require('mongoose');
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Charger les fichiers proto pour les films et les séries TV
const movieProtoPath = 'movie.proto';
const tvShowProtoPath = 'tvShow.proto';

const resolvers = require('./resolvers');
const typeDefs = require('./schema');

// Créer une nouvelle application Express
const app = express();
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const tvShowProtoDefinition = protoLoader.loadSync(tvShowProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;
const tvShowProto = grpc.loadPackageDefinition(tvShowProtoDefinition).tvShow;

// Connect to MongoDB
const connectToMongoDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/movies', { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
};

// Créer une instance ApolloServer avec le schéma et les résolveurs importés
const server = new ApolloServer({ typeDefs, resolvers });
// Appliquer le middleware ApolloServer à l'application Express
server.start().then(() => {
    app.use(
        cors(),
        bodyParser.json(),
        expressMiddleware(server),
    );
});
app.use(bodyParser.json());
app.get('/movies', (req, res) => {
    const client = new movieProto.MovieService('localhost:50051',
        grpc.credentials.createInsecure());
    client.searchMovies({}, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.movies);
        }
    });
});
app.get('/movies/:id', (req, res) => {
    const client = new movieProto.MovieService('localhost:50051',
        grpc.credentials.createInsecure());
    const _id = req.params.id;
    client.getMovie({ movie_id: _id }, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.movie);
        }
    });
});

app.post('/movies/create', (req, res) => {
    const client = new movieProto.MovieService('localhost:50051', grpc.credentials.createInsecure());
    const { title, description } = req.body;

    // Check if title and description are present
    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    const request = { title, description };

    client.createMovie(request, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.movie);
        }
    });
});

app.get('/tvshows', (req, res) => {
    const client = new tvShowProto.TVShowService('localhost:50052',
        grpc.credentials.createInsecure());
    client.searchTvshows({}, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.tv_shows);
        }
    });
});
app.get('/tvshows/:id', (req, res) => {
    const client = new tvShowProto.TVShowService('localhost:50052',
        grpc.credentials.createInsecure());
    const id = req.params.id;
    client.getTvshow({ tvShowId: id }, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.tv_show);
        }
    });
});

app.post('/movies/create', (req, res) => {
    const client = new tvShowProto.TVShowService('localhost:50052', grpc.credentials.createInsecure());
    const { title, description } = req.body;

    // Check if title and description are present
    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    const request = { title, description };

    client.createMovie(request, (err, response) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(response.tvShow);
        }
    });
});
// Démarrer l'application Express
const port = 3000;
app.listen(port, () => {
    connectToMongoDB();
    console.log(`API Gateway en cours d'exécution sur le port ${port}`);
});