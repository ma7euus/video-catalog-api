import {DefaultCrudRepository, EntityNotFoundError} from "@loopback/repository";
import {Message} from "amqplib";
import {pick} from "lodash";
import {BaseEntity} from "../models/base-entity.model";
import {ValidatorService} from "../../dist/services";

export interface SyncOptions {
    repo: DefaultCrudRepository<any, any, any>;
    data: any;
    message: Message;
}

export interface SyncRelationsOptions {
    id: string,
    action: string
    relationName: string;
    relationIds: string[],
    repo: DefaultCrudRepository<any, any, any>;
    repoRelation: DefaultCrudRepository<any, any, any>;
    message: Message;
}

export abstract class BaseModelSyncService {

    constructor(
        public validateService: ValidatorService
    ) {
    }

    protected async sync({repo, data, message}: SyncOptions) {
        const {id} = data || {};
        const action = this.getAction(message);
        const entity = this.createEntity(data, repo);
        switch (action) {
            case 'created':
                await this.validateService.validate({
                    data: entity,
                    entityClass: repo.entityClass
                })
                await repo.create({
                    ...entity,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
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
        await this.validateService.validate({
            data: entity,
            entityClass: repo.entityClass,
            ...(exists && {options: {partial: true}} as any),
        });
        exists ? await repo.updateById(id, entity) : await repo.create({
            ...entity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
    }

    async syncRelation(
        {
            id,
            action,
            relationName,
            relationIds,
            repo,
            repoRelation,
            message
        }: SyncRelationsOptions
    ) {
        const obj = await repo.findById(id);
        if (!obj) {
            const error = new EntityNotFoundError(repo.entityClass, id);
            error.name = 'ENTITY_NOT_FOUND';
            throw error;
        }

        const fieldsRelations = this.extractFieldsRelation({repo, relationName})

        const collections = await repoRelation.find({
            where: {
                or: relationIds.map(idRelation => ({id: idRelation}))
            }
        }, fieldsRelations)

        if (!collections.length) {
            const error = new EntityNotFoundError(repoRelation.entityClass, relationIds);
            error.name = 'ENTITY_NOT_FOUND';
            throw error;
        }

        switch (action) {
            case 'attached':
                await (repo as any).relationAttach(id, relationName, collections)
                break;
            case 'detach':
                await (repo as any).relationDetach(id, relationName, collections)
                break;
            default:
                console.log(action)
        }
    }

    protected extractFieldsRelation({repo, relationName}: { repo: DefaultCrudRepository<any, any, any>, relationName: string }) {
        return Object.keys(
            repo.modelClass.definition.properties[relationName].jsonSchema.items.properties
        ).reduce((obj: any, field: string) => {
            obj[field] = true;
            return obj;
        }, {})
    }
}
