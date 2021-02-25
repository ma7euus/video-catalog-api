import {BindingScope, injectable, service} from '@loopback/core';
import {rabbitmqSubscribe} from "../decorators";
import {repository} from "@loopback/repository";
import {CategoryRepository} from "../repositories";
import {Message} from "amqplib";
import {BaseModelSyncService} from "./base-model-sync.service";
import {ResponseEnum} from "../servers";
import {ValidatorService} from "./validator.service";

@injectable({scope: BindingScope.SINGLETON})
export class CategorySyncService extends BaseModelSyncService {
    constructor(
        @repository(CategoryRepository) private repo: CategoryRepository,
        @service(ValidatorService) private validator: ValidatorService,
    ) {
        super(validator);
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'micro-catalog/sync-videos/category',
        routingKey: 'model.category.*'
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
