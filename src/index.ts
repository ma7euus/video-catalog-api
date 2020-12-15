import './bootstrap';
import {
    ApplicationConfig,
    VideoCatalogApiApplication
} from './application';
import {RestServer} from "@loopback/rest";

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

import {config} from "./config";

if (require.main === module) {
    // Run the application
    main(config).catch(err => {

        console.error('Cannot start the application.', err);
        process.exit(1);

    });
}
