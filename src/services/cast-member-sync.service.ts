import {BindingScope, injectable} from '@loopback/core';
import {rabbitmqSubscribe} from "../decorators";
import {repository} from "@loopback/repository";
import {CastMemberRepository} from "../repositories";
import {Message} from "amqplib";
import {ResponseEnum} from "../servers";
import {BaseModelSyncService} from "./base-model-sync.service";

@injectable({scope: BindingScope.SINGLETON})
export class CastMemberSyncService extends BaseModelSyncService {
    constructor(
        @repository(CastMemberRepository) private repo: CastMemberRepository,
    ) {
        super();
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'micro-catalog/sync-videos/cast_member',
        routingKey: 'model.cast_member.*'
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