import {DefaultCrudRepository, EntityNotFoundError} from '@loopback/repository';
import {Message} from 'amqplib';
import {pick} from 'lodash';
import {BaseEntity} from '../models/base-entity.model';
import {ValidatorService} from './validator.service';

export interface SyncOptions {
  repo: DefaultCrudRepository<any, any, any>;
  data: any;
  message: Message;
}

export interface SyncRelationsOptions {
  id: string;
  repo: DefaultCrudRepository<any, any, any>;
  relationName: string;
  relationIds: string[];
  relationRepo: DefaultCrudRepository<any, any, any>;
  message: Message;
}

export abstract class BaseModelSyncService {
  constructor(public validateService: ValidatorService) {}

  protected async sync({repo, data, message}: SyncOptions) {
    const {id} = data || {};
    const action = this.getAction(message);
    const entity = this.createEntity(data, repo);
    switch (action) {
      case 'created':
        await this.validateService.validate({
          data: entity,
          entityClass: repo.entityClass,
        });
        await repo.create({
          ...entity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
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

  protected createEntity(
    data: any,
    repo: DefaultCrudRepository<any, any, any>,
  ) {
    return pick(data, Object.keys(repo.entityClass.definition.properties));
  }

  protected async updateOrCreate({
    repo,
    id,
    entity,
  }: {
    repo: DefaultCrudRepository<any, any, any>;
    id: string;
    entity: BaseEntity;
  }) {
    const exists = await repo.exists(id);
    await this.validateService.validate({
      data: entity,
      entityClass: repo.entityClass,
      ...(exists && {options: {partial: true}}),
    });
    return exists ? repo.updateById(id, entity) : repo.create(entity);
  }

  async syncRelation({
    id,
    repo,
    relationName,
    relationIds,
    relationRepo,
    message,
  }: SyncRelationsOptions) {
    const obj = await repo.findById(id);
    if (!obj) {
      const error = new EntityNotFoundError(repo.entityClass, id);
      error.name = 'ENTITY_NOT_FOUND';
      throw error;
    }

    const fieldsRelations = this.extractFieldsRelation({repo, relationName});

    const collections = await relationRepo.find(
      {
        where: {
          or: relationIds.map(idRelation => ({id: idRelation})),
        },
      },
      fieldsRelations,
    );

    if (!collections.length) {
      const error = new EntityNotFoundError(
        relationRepo.entityClass,
        relationIds,
      );
      error.name = 'ENTITY_NOT_FOUND';
      throw error;
    }

    const action = this.getAction(message);
    switch (action) {
      case 'attached':
        await (repo as any).attachRelation(id, relationName, collections);
        break;
      case 'detached':
        await (repo as any).detachRelation(id, relationName, collections);
        break;
      default:
        console.log(action);
    }
  }

  protected extractFieldsRelation({
    repo,
    relationName,
  }: {
    repo: DefaultCrudRepository<any, any, any>;
    relationName: string;
  }) {
    return Object.keys(
      repo.modelClass.definition.properties[relationName].jsonSchema.items
        .properties,
    ).reduce((obj: any, field: string) => {
      obj[field] = true;
      return obj;
    }, {});
  }
}
