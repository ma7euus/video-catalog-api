import {BindingScope, injectable, service} from '@loopback/core';
import {rabbitmqSubscribe} from "../decorators";
import {repository} from "@loopback/repository";
import {CategoryRepository, GenreRepository} from "../repositories";
import {Message} from "amqplib";
import {ResponseEnum} from "../servers";
import {BaseModelSyncService} from "./base-model-sync.service";
import {ValidatorService} from "./validator.service";

@injectable({scope: BindingScope.SINGLETON})
export class GenreSyncService extends BaseModelSyncService {
    constructor(
        @repository(GenreRepository) private repo: GenreRepository,
        @repository(CategoryRepository) private categoryRepo: CategoryRepository,
        @service(ValidatorService) private validator: ValidatorService,
    ) {
        super(validator);
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'micro-catalog/sync-videos/genre',
        routingKey: 'model.genre.*',
        queueOptions: {
            deadLetterExchange: 'dlx.amq.topic'
        }
    })
    async handler({data, message}: { data: any, message: Message }) {
        await this.sync({
            repo: this.repo,
            data: data,
            message: message
        });
        return ResponseEnum.ACK;
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'micro-catalog/sync-videos/genre_categories',
        routingKey: 'model.genre_categories.*',
        queueOptions: {
            deadLetterExchange: 'dlx.amq.topic'
        }
    })
    async handlerCategories({data, message}: { data: any, message: Message }) {
        console.log(data);
        await this.syncRelation({
            id: data.id,
            repo: this.repo,
            relationName: 'categories',
            relationIds: data.relation_ids as any,
            relationRepo: this.categoryRepo,
            message: message,
        });
        return ResponseEnum.ACK;
    }
}
