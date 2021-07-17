import {CastMember, CastMemberRelations} from '../models';
import {Esv7DataSource} from '../datasources';
import {inject} from '@loopback/core';
import {BaseRepository} from './base.repository';

export class CastMemberRepository extends BaseRepository<
  CastMember,
  typeof CastMember.prototype.id,
  CastMemberRelations
> {
  constructor(@inject('datasources.esv7') dataSource: Esv7DataSource) {
    super(CastMember, dataSource);
  }
}
