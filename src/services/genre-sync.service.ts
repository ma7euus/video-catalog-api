import {BindingScope, injectable, service} from '@loopback/core';
import {rabbitmqSubscribe} from "../decorators";
import {repository} from "@loopback/repository";
import {GenreRepository} from "../repositories";
import {Message} from "amqplib";
import {ResponseEnum} from "../servers";
import {BaseModelSyncService} from "./base-model-sync.service";
import {ValidatorService} from "../../dist/services";

@injectable({scope: BindingScope.SINGLETON})
export class GenreSyncService extends BaseModelSyncService {
    constructor(
        @repository(GenreRepository) private repo: GenreRepository,
        @service(ValidatorService) private validator: ValidatorService,
    ) {
        super(validator);
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'micro-catalog/sync-videos/genre',
        routingKey: 'model.genre.*'
    })
    async handler({data, message}: { data: any, message: Message }) {
        await this.sync({
            repo: this.repo,
            data: data,
            message: message
        });
        return ResponseEnum.ACK;
    }
}
