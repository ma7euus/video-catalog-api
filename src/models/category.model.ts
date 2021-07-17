import {Entity, model, property} from '@loopback/repository';
import {BaseEntity} from './base-entity.model';

export interface RelCategoryFields {
  id: string;
  name: string;
  is_active: boolean;
}

@model()
export class Category extends Entity implements BaseEntity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
    //jsonSchema: {
    // exists: ['Category', 'id']
    // }
  })
  id: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 255,
    },
  })
  name: string;

  @property({
    type: 'string',
    required: false,
    default: null,
    jsonSchema: {
      nullable: true,
    },
  })
  description: string;

  @property({
    type: 'boolean',
    required: false,
    default: true,
  })
  is_active: boolean;

  @property({
    type: 'date',
    required: true,
  })
  created_at: string;

  @property({
    type: 'date',
    required: true,
  })
  updated_at: string;

  [prop: string]: any;

  constructor(data?: Partial<Category>) {
    super(data);
  }
}

export interface CategoryRelations {
  // describe navigational properties here
}

export type CategoryWithRelations = Category & CategoryRelations;
