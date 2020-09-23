import {Context} from "@loopback/context";
import {Server} from "@loopback/core";
import {connect, Connection} from "amqplib";

export class RabbitmqServer extends Context implements Server {
    private _listening: boolean;
    private conn: Connection;

    async start(): Promise<void> {
        console.log('Starting Rabbitmq connection...');
        await connect({
            hostname: 'rabbitmq',
            username: 'admin',
            password: 'admin'
        }).then((conn) => {
            console.log('Connectec with Rabbitmq Server!');
            this.conn = conn;
            this._listening = true;
        }).catch((err) => {
            console.log('Error to onnectec with Rabbitmq Server!', err);
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return undefined;
    }

    async stop(): Promise<void> {
        await this.conn.close();
        this._listening = false;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return undefined;
    }

    get listening(): boolean {
        return this._listening;
    }
}