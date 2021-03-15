import {BindingScope, injectable, service} from '@loopback/core';
import {rabbitmqSubscribe} from "../decorators";
import {repository} from "@loopback/repository";
import {CastMemberRepository} from "../repositories";
import {Message} from "amqplib";
import {ResponseEnum} from "../servers";
import {BaseModelSyncService} from "./base-model-sync.service";
import {ValidatorService} from "./validator.service";

@injectable({scope: BindingScope.SINGLETON})
export class CastMemberSyncService extends BaseModelSyncService {
    constructor(
        @repository(CastMemberRepository) private repo: CastMemberRepository,
        @service(ValidatorService) private validator: ValidatorService,
    ) {
        super(validator);
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'micro-catalog/sync-videos/cast_member',
        routingKey: 'model.cast_member.*',
        queueOptions: {
            deadLetterExchange: 'dlx.amp.topic'
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
}
