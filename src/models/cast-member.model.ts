import {Entity, model, property} from '@loopback/repository';
import {BaseEntity} from './base-entity.model';

export enum CastMemberType {
  DIRECTOR = 1,
  ACTOR = 2,
}

@model()
export class CastMember extends Entity implements BaseEntity {
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
    type: 'boolean',
    required: false,
    default: true,
  })
  is_active: boolean;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      enum: [CastMemberType.ACTOR, CastMemberType.DIRECTOR],
    },
  })
  type: boolean;

  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
  })
  id: string;

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

  constructor(data?: Partial<CastMember>) {
    super(data);
  }
}

export interface CastMemberRelations {
  // describe navigational properties here
}

export type CastMemberWithRelations = CastMember & CastMemberRelations;
