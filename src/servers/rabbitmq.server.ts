import {Context, inject} from "@loopback/context";
import {Channel, ConfirmChannel, Connection, Options, Replies} from "amqplib";
import AssertQueue = Replies.AssertQueue;
import AssertExchange = Replies.AssertExchange;
import {CategoryRepository} from "../repositories";
import {repository} from "@loopback/repository";
import {Category} from "../models";
import {RabbitmqBindings} from "../keys";
import {Server} from "@loopback/core";
import {AmqpConnectionManager, AmqpConnectionManagerOptions, ChannelWrapper, connect} from "amqp-connection-manager";


export interface RabbitmqConfig {
    uri: string;
    connOptions?: AmqpConnectionManagerOptions;
    exchanges?: { name: string, type: string, options?: Options.AssertExchange }[]
}

export class RabbitmqServer extends Context implements Server {
    private _listening: boolean;
    private _conn: AmqpConnectionManager;
    private _channelManager: ChannelWrapper;
    channel: Channel;

    constructor(
        @repository(CategoryRepository) private categoryRepo: CategoryRepository,
        @inject(RabbitmqBindings.CONFIG) private config: RabbitmqConfig
    ) {
        super();
    }

    async start(): Promise<void> {
        console.log('Starting Rabbitmq connection...');
        this._conn = connect([this.config.uri], this.config.connOptions);
        this._channelManager = this.conn.createChannel();
        this.channelManager.on('connect', () => {
            console.log('Successfully connected a RabbitMQ Channel');
            this._listening = true;
            //this.boot();
        });
        this.channelManager.on('error', (err, {name}) => {
            console.log(`Failed to setup a RabbitMQ Channel - name: ${name} | error: ${err.message}`);
            this._listening = false;
        });
        await this.steUpExchanges();
    }

    private async steUpExchanges() {
        return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
            if(!this.config.exchanges) {
                return;
            }
            await Promise.all(this.config.exchanges.map((exchange) => (
                channel.assertExchange(exchange.name, exchange.type, exchange.options)
            )));
        });
    }

    async boot() {
        // @ts-ignore
        this.channel = await this.conn.createChannel();
        const queue: AssertQueue = await this.channel.assertQueue('micro-catalog/sync-videos');
        const exchange: AssertExchange = await this.channel.assertExchange('amq.topic', 'topic');

        await this.channel.bindQueue(queue.queue, exchange.exchange, 'model.*.*');

        this.channel.consume(queue.queue, (message) => {
            if (!message) return;
            try {
                const data = JSON.parse(message?.content?.toString());
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

    get conn(): AmqpConnectionManager {
        return this._conn;
    }

    get channelManager(): ChannelWrapper {
        return this._channelManager;
    }
}
