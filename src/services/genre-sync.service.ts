import {BindingScope, injectable} from '@loopback/core';
import {rabbitmqSubscribe} from "../decorators";
import {repository} from "@loopback/repository";
import {GenreRepository} from "../repositories";
import {Message} from "amqplib";

@injectable({scope: BindingScope.TRANSIENT})
export class GenreSyncService {
    constructor(
        @repository(GenreRepository) private repo: GenreRepository,
    ) {
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'micro-catalog/sync-videos/genre',
        routingKey: 'model.genre.*'
    })
    async handler({data, message}: { data: any, message: Message }) {
        const action = message.fields.routingKey.split('.')[2];
        switch (action) {
            case 'created':
                await this.repo.create(data);
                break;
            case 'updated':
                await this.repo.updateById(data.id, data);
                break;
            case 'deleted':
                await this.repo.deleteById(data.id);
                break;
        }
    }
}
