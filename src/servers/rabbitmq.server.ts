import {Context, inject, Binding} from "@loopback/context";
import {Channel, ConfirmChannel, Connection, Options, Replies} from "amqplib";
import AssertQueue = Replies.AssertQueue;
import AssertExchange = Replies.AssertExchange;
import {CategoryRepository} from "../repositories";
import {repository} from "@loopback/repository";
import {Category} from "../models";
import {RabbitmqBindings} from "../keys";
import {Application, CoreBindings, Server} from "@loopback/core";
import {AmqpConnectionManager, AmqpConnectionManagerOptions, ChannelWrapper, connect} from "amqp-connection-manager";
import {RABBITMQ_SUBSCRIBE_DECORATOR} from "../decorators";
import {CategorySyncService} from "../services";
import {MetadataInspector} from "@loopback/metadata";

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
        @inject(CoreBindings.APPLICATION_INSTANCE) public app: Application,
        @repository(CategoryRepository) private categoryRepo: CategoryRepository,
        @inject(RabbitmqBindings.CONFIG) private config: RabbitmqConfig
    ) {
        super(app);
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
        console.log(this.getSubscribers());
    }

    private async steUpExchanges() {
        return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
            if (!this.config.exchanges) {
                return;
            }
            await Promise.all(this.config.exchanges.map((exchange) => (
                channel.assertExchange(exchange.name, exchange.type, exchange.options)
            )));
        });
    }

    private getSubscribers() {
        const bindings: Readonly<Binding<any>>[] = this.find('services.*');
        return bindings.map(
            binding => {
                const metadata = MetadataInspector.getAllMethodMetadata(
                    RABBITMQ_SUBSCRIBE_DECORATOR, binding.valueConstructor?.prototype);
                if (!metadata) {
                    return [];
                }
                const methods = [];
                for (const methodName in metadata) {
                    if (!Object.prototype.hasOwnProperty.call(metadata, methodName)) return;
                    const service = this.getSync(binding.key) as any;
                    methods.push({
                        method: service[methodName].bind(service),
                        metadata: metadata[methodName]
                    });
                }
                return methods;
            }
        )
        //const service = this.getSync<CategorySyncService>('services.CategorySyncService');
        //const metadata = MetadataInspector.getAllMethodMetadata(RABBITMQ_SUBSCRIBE_DECORATOR, service);
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
