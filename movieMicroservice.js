// movieMicroservice.js
const grpc = require('@grpc/grpc-js');
const mongoose = require('mongoose');
const protoLoader = require('@grpc/proto-loader');
const { consumeMessages, sendMessage } = require('./kafkaHelper');

// Charger le fichier movie.proto
const movieProtoPath = 'movie.proto';
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/movies', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define the movie schema    
const MovieModel = mongoose.model('Movie', {
    title: String,
    description: String,
});

// Implémenter le service movie
const movieService = {
    getMovie: async (call, callback) => {
        const { movie_id } = call.request;
        try {
            // Find the movie by its ID in the database
            const movie = await MovieModel.findOne({ _id: movie_id });
            if (!movie) {
                const notFoundError = new Error(`Movie with ID ${movie_id} not found`);
                console.error(notFoundError);
                throw notFoundError;
            }
            console.log('Movie retrieved successfully:', movie);
            callback(null, { movie });
        } catch (err) {
            console.error('Error retrieving movie:', err);
            callback(err);
        }
    },

    // Search for movies where title or description contains the query string
    searchMovies: async (call, callback) => {
        const { query } = call.request;
        try {
            const movies = await MovieModel.find({
                $or: [
                    { title: { $regex: `^.*${query}.*`, $options: 'i' } },
                    { description: { $regex: `^.*${query}.*`, $options: 'i' } }
                ]
            });
            callback(null, { movies });
        } catch (err) {
            console.error('Error searching movies:', err);
            callback(err);
        }
    },
    // Ajouter d'autres méthodes au besoin
    createMovie: async (call, callback) => {
        const { title, description } = call.request;
        const newMovie = new MovieModel({
            title,
            description
        });
        const savedMovie = await newMovie.save()
        await sendMessage('movies_topic', savedMovie);
        callback(null, { movie: savedMovie });
        await consumeMessages('movies_topic', savedMovie);
    },
};

// Créer et démarrer le serveur gRPC
const server = new grpc.Server();
server.addService(movieProto.MovieService.service, movieService);
const port = 50051;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Échec de la liaison du serveur:', err);
            return;
        }
        console.log(`Le serveur s'exécute sur le port ${port}`);
        server.start();
    });
console.log(`Microservice de films en cours d'exécution sur le port ${port}`);
