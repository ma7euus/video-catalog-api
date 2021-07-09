import {BootMixin} from '@loopback/boot';
import {Application, ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import {RabbitmqServer} from "./servers";
import {RestComponent, RestServer} from "@loopback/rest";
import {RestExplorerBindings} from "@loopback/rest-explorer";
import {EntityComponent, RestExplorerComponent, ValidatorsComponent} from "./components";
import {CrudRestComponent} from '@loopback/rest-crud';
import {AuthenticationComponent} from "@loopback/authentication";
import {JWTAuthenticationComponent, TokenServiceBindings} from "@loopback/authentication-jwt";
import {JWTService} from "./services/auth/jwt.service";
import {AuthorizationComponent, AuthorizationDecision, AuthorizationTags} from "@loopback/authorization";
import {SubscriberAuthorizationProvider} from "./providers/subscriber-authorization.provider";

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
        this.component(EntityComponent);
        this.component(AuthenticationComponent);
        this.component(JWTAuthenticationComponent);
        this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);
        const bindings = this.component((AuthorizationComponent));
        this.configure(bindings.key).to({
            precedence: AuthorizationDecision.DENY,
            defaultDecision: AuthorizationDecision.DENY
        });

        this.bind('authorizationProviders.subscriber-provider')
            .toProvider(SubscriberAuthorizationProvider)
            .tag(AuthorizationTags.AUTHORIZER);

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

       /* const validator = this.getSync<ValidatorService>('services.ValidatorService');
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
        }*/
    }
}