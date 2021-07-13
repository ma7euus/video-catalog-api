import './bootstrap';
import {
    VideoCatalogApiApplication
} from './application';
import {RestServer} from "@loopback/rest";
import {ApplicationConfig} from "@loopback/core";
export * from './application';

export async function main(options: ApplicationConfig = {}) {
    const app = new VideoCatalogApiApplication(options);
    await app.boot();
    await app.start();

    const restServer = app.getSync<RestServer>('servers.RestServer');
    const url = restServer.url;
    console.log(`Server is running at ${url}`);
    console.log(`Try ${url}/ping`);

    return app;
}