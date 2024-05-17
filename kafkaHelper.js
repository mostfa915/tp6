const { Kafka } = require('kafkajs');

// Configuration de Kafka
const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092']
});

// Création d'un producteur Kafka
const producer = kafka.producer();

// Fonction pour envoyer un message à un topic Kafka
const sendMessage = async (topic, message) => {
    try {
        await producer.connect();
        console.log('Producer connected');

        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }],
        });

        console.log(`Message sent to topic ${topic}:`, message);
        await producer.disconnect();
        console.log('Producer disconnected');
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message à Kafka:', error);
    }
};

// Fonction pour consommer les messages d'un topic Kafka
const consumeMessages = async (topic) => {
    try {
        const consumer = kafka.consumer({ groupId: 'my-group' });
        await consumer.connect();
        console.log('Consumer connected');

        await consumer.subscribe({ topic });
        console.log(`Consumer subscribed to topic ${topic}`);
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log(`Message received from topic ${topic}:`, message.value.toString());
            },
        });
        await consumer.disconnect();
        console.log('consumer disconnected');
    } catch (error) {
        console.error('Erreur lors de la consommation des messages Kafka:', error);
    }
};

module.exports = {
    sendMessage,
    consumeMessages,
};
