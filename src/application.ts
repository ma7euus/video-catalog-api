import {BootMixin} from '@loopback/boot';
import {Application, ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import {RabbitmqServer} from "./servers";
import {RestComponent, RestServer} from "@loopback/rest";
import {RestExplorerBindings} from "@loopback/rest-explorer";
import {RestExplorerComponent, ValidatorsComponent} from "./components";
import {CrudRestComponent} from '@loopback/rest-crud';
import {ValidatorService} from "./services";
import {Category} from "./models";

export {ApplicationConfig};

export class VideoCatalogApiApplication extends BootMixin(
    ServiceMixin(RepositoryMixin(Application)),
) {
    constructor(options: ApplicationConfig = {}) {
        super(options);

        options.rest.sequence = MySequence;
        this.component(RestComponent);
        const restServer = this.getSync<RestServer>('servers.RestServer');
        restServer.static('/', path.join(__dirname, '../public'));

        // Customize @loopback/rest-explorer configuration here
        this.configure(RestExplorerBindings.COMPONENT).to({
            path: '/explorer',
        });
        this.component(RestExplorerComponent);
        this.component(ValidatorsComponent);

        this.projectRoot = __dirname;
        // Customize @loopback/boot Booter Conventions here
        this.bootOptions = {
            controllers: {
                // Customize ControllerBooter Conventions here
                dirs: ['controllers'],
                extensions: ['.controller.js'],
                nested: true,
            },
        };
        this.servers([RabbitmqServer]);
        this.component(CrudRestComponent);
    }

    async boot() {
        await super.boot();

        const validator = this.getSync<ValidatorService>('services.ValidatorService');
        try {
            await validator.validate({
                data: {
                    //id: ['123123', '123121231233', 'aa']
                    id: '111'
                },
                entityClass: Category
            });
        } catch (e) {
            console.dir(e, {depth: 8});
        }
    }
}