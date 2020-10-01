import {Context} from "@loopback/context";
import {Server} from "@loopback/core";
import {Channel, connect, Connection, Replies} from "amqplib";
import AssertQueue = Replies.AssertQueue;
import AssertExchange = Replies.AssertExchange;
import {CategoryRepository} from "../repositories";
import {repository} from "@loopback/repository";
import {Category} from "../models";

export class RabbitmqServer extends Context implements Server {
    private _listening: boolean;
    private conn: Connection;
    private channel: Channel;

    constructor(@repository(CategoryRepository) private categoryRepo: CategoryRepository) {
        super();
    }

    async start(): Promise<void> {
        console.log('Starting Rabbitmq connection...');
        await connect({
            hostname: process.env.RABBITMQ_SERVER_HOST,
            //port: process.env.RABBITMQ_SERVER_PORT,
            username: process.env.RABBITMQ_SERVER_USER,
            password: process.env.RABBITMQ_SERVER_PASSWORD
        }).then((conn) => {
            console.log('Connectec with Rabbitmq Server!');
            this.conn = conn;
            this._listening = true;
            this.boot();
        }).catch((err) => {
            console.log('Error to onnectec with Rabbitmq Server!', err);
        });
    }

    async boot() {
        this.channel = await this.conn.createChannel();
        const queue: AssertQueue = await this.channel.assertQueue('micro-catalog/sync-videos');
        const exchange: AssertExchange = await this.channel.assertExchange('amq.topic', 'topic');

        await this.channel.bindQueue(queue.queue, exchange.exchange, 'model.*.*');

        this.channel.consume(queue.queue, (message) => {
            if (!message) return;
            try {
                const data = JSON.parse(message?.content.toString());
                const [model, event] = message.fields.routingKey.split('.').slice(1);
                this.sync({model, event, data})
                    .then(() => this.channel.ack(message))
                    .catch((error) => {
                        console.log(error);
                        this.channel.reject(message, false);
                    });
            } catch (e) {
                console.log(e);
                this.channel.reject(message, false);
                return;
            }
        });
        //console.log(result);
    }

    async sync({model, event, data}: { model: string, event: string, data: Category }) {
        if (model === 'category') {
            switch (event) {
                case 'created':
                    await this.categoryRepo.create({
                        ...data,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    break;
                case 'updated':
                    await this.categoryRepo.updateById(data.id, data);
                    break;
                case 'deleted':
                    await this.categoryRepo.deleteById(data.id);
                    break;
            }
        }
    }

    async stop(): Promise<void> {
        await this.conn.close();
        this._listening = false;
    }

    get listening(): boolean {
        return this._listening;
    }
}
