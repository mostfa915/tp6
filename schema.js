const { gql } = require('@apollo/server');
// Définir le schéma GraphQL
const typeDefs = `#graphql

type Movie {
    _id: ID!
    title: String!
    description: String!    
}

type TVShow {
    id: ID!
    title: String!
    description: String!
}

type Query {
    movie(id: String!): Movie
    movies: [Movie]
    tvShow(id: String!): TVShow
    tvShows: [TVShow]
}

type Mutation {
    addMovie(title: String!, description: String!): Movie!
    addTvShow(title: String!, description: String!): TVShow!
}
`;
module.exports = typeDefs
