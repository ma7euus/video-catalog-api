import {Context, inject, Binding} from '@loopback/context';
import {Channel, ConfirmChannel, Message, Options} from 'amqplib';
import {RabbitmqBindings} from '../keys';
import {Application, CoreBindings, Server} from '@loopback/core';
import {
  AmqpConnectionManager,
  AmqpConnectionManagerOptions,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import {
  RABBITMQ_SUBSCRIBE_DECORATOR,
  RabbitmqSubscribeMetadata,
} from '../decorators';
import {MetadataInspector} from '@loopback/metadata';

export enum ResponseEnum {
  ACK = 0,
  REQUEUE = 1,
  NACK = 2,
}

export interface RabbitmqConfig {
  uri: string;
  connOptions?: AmqpConnectionManagerOptions;
  exchanges?: {name: string; type: string; options?: Options.AssertExchange}[];
  queues?: {
    name: string;
    options?: Options.AssertQueue;
    exchange?: {name: string; routingKey: string};
  }[];
  defaultHandlerError?: ResponseEnum;
}

export class RabbitmqServer extends Context implements Server {
  private _listening: boolean;
  private _conn: AmqpConnectionManager;
  private _channelWrapper: ChannelWrapper;
  private maxAttempts = 3;

  channel: Channel;

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) public app: Application,
    @inject(RabbitmqBindings.CONFIG) private config: RabbitmqConfig,
  ) {
    super(app);
  }

  async start(): Promise<void> {
    console.log('Starting Rabbitmq connection...');
    this._conn = connect([this.config.uri], this.config.connOptions);
    this._channelWrapper = this._conn.createChannel();
    this._channelWrapper
      .on('connect', () => {
        console.log('Successfully connected a RabbitMQ Channel');
        this._listening = true;
      })
      .on('error', (err, {name}) => {
        console.log(
          `Failed to setup a RabbitMQ Channel - name: ${name} | error: ${err.message}`,
        );
        this._listening = false;
      });

    await this.setUpExchanges();
    await this.setUpQueues();
    await this.bindSubscribers();
  }

  private async setUpExchanges() {
    return this._channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      if (!this.config.exchanges) {
        return;
      }
      await Promise.all(
        this.config.exchanges.map(exchange =>
          channel.assertExchange(
            exchange.name,
            exchange.type,
            exchange.options,
          ),
        ),
      );
    });
  }

  private async setUpQueues() {
    return this._channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      if (!this.config.queues) {
        return;
      }
      await Promise.all(
        this.config.queues.map(async queue => {
          await channel.assertQueue(queue.name, queue.options);
          if (!queue.exchange) return;
          await channel.bindQueue(
            queue.name,
            queue.exchange.name,
            queue.exchange.routingKey,
          );
        }),
      );
    });
  }

  private async bindSubscribers() {
    this.getSubscribers().map(async item => {
      await this._channelWrapper.addSetup(async (channel: ConfirmChannel) => {
        const {exchange, queue, routingKey, queueOptions} = item.metadata;
        const assertQueue = await channel.assertQueue(
          queue ?? '',
          queueOptions ?? undefined,
        );
        const routingKeys = Array.isArray(routingKey)
          ? routingKey
          : [routingKey];

        await Promise.all(
          routingKeys.map((routing: string) =>
            channel.bindQueue(assertQueue.queue, exchange, routing),
          ),
        );

        await this.consume({
          channel,
          queue: assertQueue.queue,
          method: item.method,
        });
      });
    });
  }

  private getSubscribers(): {
    method: Function;
    metadata: RabbitmqSubscribeMetadata;
  }[] {
    const bindings: Readonly<Binding<any>>[] = this.find('services.*');
    return bindings
      .map(binding => {
        const metadata = MetadataInspector.getAllMethodMetadata(
          RABBITMQ_SUBSCRIBE_DECORATOR,
          binding.valueConstructor?.prototype,
        );
        if (!metadata) {
          return [];
        }
        const methods = [];
        for (const methodName in metadata) {
          if (!Object.prototype.hasOwnProperty.call(metadata, methodName))
            return;
          const service = this.getSync(binding.key) as any;
          methods.push({
            method: service[methodName].bind(service),
            metadata: metadata[methodName],
          });
        }
        return methods;
      })
      .reduce((collection: any, item: any) => {
        collection.push(...item);
        return collection;
      }, []);
  }

  private async consume({
    channel,
    queue,
    method,
  }: {
    channel: ConfirmChannel;
    queue: string;
    method: Function;
  }) {
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
          const [action] = message.fields.routingKey.split('.').slice(2);
          const responseType = await method({data, message, channel, action});
          this.dispatchResponse(channel, message, responseType);
        }
      } catch (e) {
        console.error(e, {
          routingKey: message?.fields.routingKey,
          content: message?.content.toString(),
        });
        if (!message) {
          return;
        }
        this.dispatchResponse(
          channel,
          message,
          this.config?.defaultHandlerError,
        );
      }
    });
  }

  private dispatchResponse(
    channel: Channel,
    message: Message,
    responseType?: ResponseEnum,
  ) {
    switch (responseType) {
      case ResponseEnum.REQUEUE:
        channel.nack(message, false, true);
        break;
      case ResponseEnum.NACK:
        this.handleNack({channel, message});
        break;
      case ResponseEnum.ACK:
      default:
        channel.ack(message);
    }
  }

  canDeadLetter({channel, message}: {channel: Channel; message: Message}) {
    if (message.properties.headers && 'x-death' in message.properties.headers) {
      const count = message.properties.headers['x-death']![0].count;
      if (count >= this.maxAttempts) {
        channel.ack(message);
        const queue = message.properties.headers['x-death']![0].queue;
        console.log(
          `Ack in ${queue} with error. Max attempts exceeded ${this.maxAttempts}`,
        );
        return false;
      }
    }
    return true;
  }

  handleNack({channel, message}: {channel: Channel; message: Message}) {
    const canDeadLetter = this.canDeadLetter({channel, message});
    if (canDeadLetter) {
      console.log('Nack in message', {content: message.content.toString()});
      channel.nack(message, false, false);
    } else {
      channel.ack(message);
    }
  }

  async stop(): Promise<void> {
    await this._conn.close();
    this._listening = false;
  }

  get listening(): boolean {
    return this._listening;
  }

  get conn(): AmqpConnectionManager {
    return this._conn;
  }

  get channelWrapper(): ChannelWrapper {
    return this._channelWrapper;
  }
}
