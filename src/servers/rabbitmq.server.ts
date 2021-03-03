import {Context, inject, Binding} from "@loopback/context";
import {Channel, ConfirmChannel, Message, Options} from "amqplib";
import {CategoryRepository} from "../repositories";
import {repository} from "@loopback/repository";
import {RabbitmqBindings} from "../keys";
import {Application, CoreBindings, Server} from "@loopback/core";
import {AmqpConnectionManager, AmqpConnectionManagerOptions, ChannelWrapper, connect} from "amqp-connection-manager";
import {RABBITMQ_SUBSCRIBE_DECORATOR, RabbitmqSubscribeMetada} from "../decorators";
import {MetadataInspector} from "@loopback/metadata";

export enum ResponseEnum {
    ACK = 0,
    REQUEUE = 1,
    NACK = 2
}

export interface RabbitmqConfig {
    uri: string;
    connOptions?: AmqpConnectionManagerOptions;
    exchanges?: { name: string, type: string, options?: Options.AssertExchange }[];
    defaultHandlerError?: ResponseEnum;
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
        });
        this.channelManager.on('error', (err, {name}) => {
            console.log(`Failed to setup a RabbitMQ Channel - name: ${name} | error: ${err.message}`);
            this._listening = false;
        });
        await this.setUpExchanges();
        await this.channelManager.addSetup(async (channel: ConfirmChannel) => {
            const assertExchange = await channel.assertExchange('dlx.amq.topic', 'topic');
            const assertQueue = await channel.assertQueue(
                'dlx.sync-videos',
                {
                    deadLetterExchange: 'amq.topic',
                    messageTtl: 20000
                }
            );
            await channel.bindQueue(assertQueue.queue, assertExchange.exchange, 'model.category.*');
        });
        await this.bindSubscribers();

    }

    private async setUpExchanges() {
        return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
            if (!this.config.exchanges) {
                return;
            }
            await Promise.all(this.config.exchanges.map((exchange) => (
                channel.assertExchange(exchange.name, exchange.type, exchange.options)
            )));
        });
    }

    private async bindSubscribers() {
        this.getSubscribers()?.map(async (item) => {

            await this.channelManager.addSetup(async (channel: ConfirmChannel) => {
                const {exchange, queue, routingKey, queueOptions} = item.metadata;
                const assertQueue = await channel.assertQueue(
                    queue ?? '',
                    queueOptions ?? undefined
                );
                const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];

                await Promise.all(
                    routingKeys.map((x) => channel.bindQueue(assertQueue.queue, exchange, x))
                );
                await this.consume({
                    channel,
                    queue: assertQueue.queue,
                    method: item.method
                });
            });
        });
    }

    private getSubscribers(): any[] | undefined {
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
        ).reduce((collection: any, item: any) => {
            collection.push(...item);
            return collection;
        }, []);
        //const service = this.getSync<CategorySyncService>('services.CategorySyncService');
        //const metadata = MetadataInspector.getAllMethodMetadata(RABBITMQ_SUBSCRIBE_DECORATOR, service);
    }

    private async consume({channel, queue, method}: { channel: ConfirmChannel, queue: string, method: Function }) {
        await channel.consume(queue, async message => {
            try {
                if (!message) {
                    throw new Error('Received null message');
                }
                const content = message.content;
                if (content) {
                    let data;
                    try {
                        data = JSON.parse(content.toString());
                    } catch (e) {
                        data = null;
                    }
                    console.log(data);
                    const responseType = await method({data, message, channel});
                    this.dispatchResponse(channel, message, responseType);
                }
            } catch (e) {
                console.error(e);
                if(!message){
                    return;
                }
                this.dispatchResponse(channel, message, this.config?.defaultHandlerError);
            }
        });
    }

    private dispatchResponse(channel: Channel, message: Message, responseType?: ResponseEnum) {
        switch (responseType) {
            case ResponseEnum.REQUEUE:
                channel.nack(message, false, true);
                break;
            case ResponseEnum.NACK:
                channel.nack(message, false, false);
                break;
            case ResponseEnum.ACK:
            default:
                channel.ack(message);
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
