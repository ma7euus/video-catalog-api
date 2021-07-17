import {chalk} from '../require';
import {VideoCatalogApiApplication} from '../application';
import {Esv7DataSource} from '../datasources';
import fixtures from '../fixtures';
import {DefaultCrudRepository} from '@loopback/repository';
import {ValidatorService} from '../services';
import * as config from '../../config';

export class FixturesCommand {
  static command = 'fixtures';
  static description = 'Fixtures data in ElasticSearch';

  app: VideoCatalogApiApplication;

  async run() {
    console.log(chalk.green('Fixture data'));
    await this.bootApp();
    console.log(chalk.green('Delete all documents'));
    const datasource: Esv7DataSource = this.app.getSync('datasources.esv7');
    await datasource.deleteAllDocuments();

    const validator = this.app.getSync<ValidatorService>(
      'services.ValidatorService',
    );

    for (const fixture of fixtures) {
      const repo = this.getRepository<DefaultCrudRepository<any, any, any>>(
        fixture.model,
      );
      await validator.validate({
        data: fixture.fields,
        entityClass: repo.entityClass,
      });
      await repo.create(fixture.fields);
    }

    console.log(chalk.green('Documents generated'));
  }

  private async bootApp() {
    this.app = new VideoCatalogApiApplication(config);
    await this.app.boot();
  }

  private getRepository<T>(modelName: string): T {
    return this.app.getSync(`repositories.${modelName}Repository`);
  }
}
