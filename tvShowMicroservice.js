// tvShowMicroservice.js
const grpc = require('@grpc/grpc-js');
const mongoose = require('mongoose');
const protoLoader = require('@grpc/proto-loader');
const { consumeMessages, sendMessage } = require('./kafkaHelper')
// Charger le fichier tvShow.proto
const tvShowProtoPath = 'tvShow.proto';
const tvShowProtoDefinition = protoLoader.loadSync(tvShowProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const tvShowProto = grpc.loadPackageDefinition(tvShowProtoDefinition).tvShow;

mongoose.connect('mongodb://localhost:27017/movies', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define the movie schema
const TvShowModel = mongoose.model('TvShow', {
    title: String,
    description: String,
});

// Implémenter le service de séries TV
const tvShowService = {
    getTvshow: async (call, callback) => {
        // Récupérer les détails de la série TV à partir de la base de données
        const { tv_show_id } = call.request;
        try {
            // Find the tvShow by its ID in the database
            const tvShow = await TvShowModel.findOne({ _id: tv_show_id });
            if (!tvShow) {
                const notFoundError = new Error(`Movie with ID ${tv_show_id} not found`);
                console.error(notFoundError);
                throw notFoundError;
            }
            console.log('Movie retrieved successfully:', tvShow);
            callback(null, { tv_show: tvShow });
        } catch (err) {
            console.error('Error retrieving movie:', err);
            callback(err);
        }
    },
    // Search for tvShow where title or description contains the query string
    SearchTvshows: async (call, callback) => {
        const { query } = call.request;
        try {
            const tvShow = await TvShowModel.find({
                $or: [
                    { title: { $regex: `^.*${query}.*`, $options: 'i' } },
                    { description: { $regex: `^.*${query}.*`, $options: 'i' } }
                ]
            });
            callback(null, { tv_shows: tvShow });
        } catch (err) {
            console.error('Error searching tv Show:', err);
            callback(err);
        }
    },

    CreateTvShow: async (call, callback) => {
        const { title, description } = call.request;
        const newTvShow = new TvShowModel({
            title,
            description,
        });
        const savedTvShow = await newTvShow.save()
        await sendMessage('tvshows_topic', { title, description });
        callback(null, { tv_show: savedTvShow });
        await consumeMessages('tvshows_topic', savedTvShow);
    },
};
// Créer et démarrer le serveur gRPC
const server = new grpc.Server();
server.addService(tvShowProto.TVShowService.service, tvShowService);
const port = 50052;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error('Échec de la liaison du serveur:', err);
            return;
        }
        console.log(`Le serveur s'exécute sur le port ${port}`);
        server.start();
    });
console.log(`Microservice de séries TV en cours d'exécution sur le port ${port}`);
consumeMessages('new_tv_shows');
