import {DefaultCrudRepository} from "@loopback/repository";
import {Message} from "amqplib";
import {pick} from "lodash";
import {BaseEntity} from "../models/base-entity.model";

export interface SyncOptions {
    repo: DefaultCrudRepository<any, any, any>;
    data: any;
    message: Message;
}

export abstract class BaseModelSyncService {

    protected async sync({repo, data, message}: SyncOptions) {
        const {id} = data || {};
        const action = this.getAction(message);
        const entity = this.createEntity(data, repo);
        switch (action) {
            case 'created':
                await repo.create(entity);
                break;
            case 'updated':
                await this.updateOrCreate({repo, id, entity});
                break;
            case 'deleted':
                await repo.deleteById(id);
                break;
        }
    }

    protected getAction(message: Message) {
        return message.fields.routingKey.split('.')[2];
    }

    protected createEntity(data: any, repo: DefaultCrudRepository<any, any, any>) {
        return pick(data, Object.keys(repo.entityClass.definition.properties));
    }

    protected async updateOrCreate({repo, id, entity}: { repo: DefaultCrudRepository<any, any, any>, id: string, entity: BaseEntity }) {
        const exists = repo.exists(id);
        return exists ? repo.updateById(id, entity) : repo.create(entity);
    }
}
